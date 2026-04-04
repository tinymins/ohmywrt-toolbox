use sea_orm::*;

use crate::db::entities::users;
use crate::error::{parse_uuid, AppError};

pub struct UserRepo;

impl UserRepo {
    pub async fn get_by_id(
        db: &DatabaseConnection,
        user_id: &str,
    ) -> Result<Option<users::Model>, AppError> {
        let uid = parse_uuid(user_id)?;
        Ok(users::Entity::find_by_id(uid).one(db).await?)
    }

    pub async fn update_profile(
        db: &DatabaseConnection,
        user_id: &str,
        name: Option<&str>,
        email: Option<&str>,
        settings: Option<serde_json::Value>,
    ) -> Result<users::Model, AppError> {
        let uid = parse_uuid(user_id)?;
        let user = users::Entity::find_by_id(uid)
            .one(db)
            .await?
            .ok_or_else(|| AppError::NotFound("user not found".into()))?;

        let mut active: users::ActiveModel = user.into();
        if let Some(n) = name {
            active.name = Set(n.to_string());
        }
        if let Some(e) = email {
            active.email = Set(e.to_string());
        }
        if let Some(s) = settings {
            active.settings = Set(Some(s));
        }
        Ok(active.update(db).await?)
    }

    pub async fn update_password(
        db: &DatabaseConnection,
        user_id: &str,
        password_hash: &str,
    ) -> Result<(), AppError> {
        let uid = parse_uuid(user_id)?;
        let user = users::Entity::find_by_id(uid)
            .one(db)
            .await?
            .ok_or_else(|| AppError::NotFound("user not found".into()))?;
        let mut active: users::ActiveModel = user.into();
        active.password_hash = Set(password_hash.to_string());
        active.update(db).await?;
        Ok(())
    }

    pub async fn clear_avatar_key(
        db: &DatabaseConnection,
        user_id: &str,
    ) -> Result<users::Model, AppError> {
        let uid = parse_uuid(user_id)?;
        let user = users::Entity::find_by_id(uid)
            .one(db)
            .await?
            .ok_or_else(|| AppError::NotFound("user not found".into()))?;

        let mut settings = user
            .settings
            .clone()
            .unwrap_or_else(|| serde_json::json!({}));
        if let Some(obj) = settings.as_object_mut() {
            obj.remove("avatarKey");
        }

        let mut active: users::ActiveModel = user.into();
        active.settings = Set(Some(settings));
        Ok(active.update(db).await?)
    }
}
