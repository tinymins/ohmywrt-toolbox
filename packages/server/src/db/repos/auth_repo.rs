use chrono::Utc;
use sea_orm::*;
use tracing::error;
use uuid::Uuid;

use crate::db::entities::sessions;
use crate::db::entities::users;
use crate::error::{parse_uuid, AppError};

pub struct AuthRepo;

impl AuthRepo {
    pub async fn find_user_by_email(
        db: &DatabaseConnection,
        email: &str,
    ) -> Result<Option<users::Model>, AppError> {
        Ok(users::Entity::find()
            .filter(users::Column::Email.eq(email))
            .one(db)
            .await?)
    }

    pub async fn count_users(db: &DatabaseConnection) -> Result<u64, AppError> {
        Ok(users::Entity::find().count(db).await?)
    }

    pub async fn create_user(
        db: &DatabaseConnection,
        name: &str,
        email: &str,
        password_hash: &str,
        role: &str,
    ) -> Result<users::Model, AppError> {
        let id = Uuid::new_v4();
        let active = users::ActiveModel {
            id: Set(id),
            name: Set(name.to_string()),
            email: Set(email.to_string()),
            password_hash: Set(password_hash.to_string()),
            role: Set(role.to_string()),
            settings: Set(None),
            created_at: Set(Some(Utc::now().into())),
        };
        users::Entity::insert(active).exec(db).await?;
        users::Entity::find_by_id(id)
            .one(db)
            .await?
            .ok_or_else(|| AppError::Internal("failed to fetch created user".into()))
    }

    pub async fn create_session(
        db: &DatabaseConnection,
        user_id: &str,
    ) -> Result<String, AppError> {
        let uid = parse_uuid(user_id)?;
        let session_id = Uuid::new_v4();
        let expires_at = (Utc::now() + chrono::Duration::days(7)).into();
        let active = sessions::ActiveModel {
            id: Set(session_id),
            user_id: Set(uid),
            expires_at: Set(expires_at),
            created_at: Set(Some(Utc::now().into())),
        };
        sessions::Entity::insert(active).exec(db).await?;
        Ok(session_id.to_string())
    }

    pub async fn get_user_id_by_session(
        db: &DatabaseConnection,
        session_id: &str,
    ) -> Result<Option<String>, AppError> {
        let sid = parse_uuid(session_id)?;
        let row = sessions::Entity::find_by_id(sid)
            .filter(sessions::Column::ExpiresAt.gt(Utc::now()))
            .one(db)
            .await
            .map_err(|err| {
                error!("get_user_id_by_session failed: {}", err);
                AppError::Internal("Session lookup failed".into())
            })?;
        Ok(row.map(|r| r.user_id.to_string()))
    }

    pub async fn delete_session(db: &DatabaseConnection, session_id: &str) -> Result<(), AppError> {
        let sid = parse_uuid(session_id)?;
        sessions::Entity::delete_by_id(sid).exec(db).await?;
        Ok(())
    }

    pub async fn delete_other_sessions(
        db: &DatabaseConnection,
        user_id: &str,
        keep_session_id: &str,
    ) -> Result<(), AppError> {
        let uid = parse_uuid(user_id)?;
        let keep_sid = parse_uuid(keep_session_id)?;
        sessions::Entity::delete_many()
            .filter(sessions::Column::UserId.eq(uid))
            .filter(sessions::Column::Id.ne(keep_sid))
            .exec(db)
            .await?;
        Ok(())
    }
}
