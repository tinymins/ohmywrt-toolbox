use chrono::Utc;
use sea_orm::*;
use sea_orm::prelude::DateTimeWithTimeZone;
use uuid::Uuid;

use crate::db::entities::{
    invitation_codes, sessions, system_settings, users,
    users::UserRole,
};
use crate::error::AppError;
use crate::services::auth::hash_password;

pub struct AdminRepo;

impl AdminRepo {
    // ── User Management ──

    pub async fn list_all_users(db: &DatabaseConnection) -> Result<Vec<users::Model>, AppError> {
        Ok(users::Entity::find()
            .order_by_asc(users::Column::CreatedAt)
            .all(db)
            .await?)
    }

    pub async fn get_last_login_at(
        db: &DatabaseConnection,
        user_id: &str,
    ) -> Result<Option<DateTimeWithTimeZone>, AppError> {
        let row = sessions::Entity::find()
            .filter(sessions::Column::UserId.eq(user_id))
            .order_by_desc(sessions::Column::CreatedAt)
            .one(db)
            .await?;
        Ok(row.and_then(|r| r.created_at))
    }

    pub async fn create_user(
        db: &DatabaseConnection,
        name: &str,
        email: &str,
        password: &str,
        role: UserRole,
    ) -> Result<users::Model, AppError> {
        let existing = users::Entity::find()
            .filter(users::Column::Email.eq(email))
            .one(db)
            .await?;
        if existing.is_some() {
            return Err(AppError::Conflict("Email already registered".into()));
        }

        let password_hash =
            hash_password(password).map_err(|e| AppError::Internal(format!("Hash error: {e}")))?;
        let id = Uuid::new_v4().to_string();
        let active = users::ActiveModel {
            id: Set(id.clone()),
            name: Set(name.to_string()),
            email: Set(email.to_string()),
            password_hash: Set(password_hash),
            role: Set(role),
            settings: Set(None),
            created_at: Set(Some(Utc::now().into())),
        };
        users::Entity::insert(active).exec(db).await?;
        users::Entity::find_by_id(id)
            .one(db)
            .await?
            .ok_or_else(|| AppError::Internal("Failed to fetch created user".into()))
    }

    pub async fn update_user_role(
        db: &DatabaseConnection,
        user_id: &str,
        role: UserRole,
    ) -> Result<users::Model, AppError> {
        let user = users::Entity::find_by_id(user_id)
            .one(db)
            .await?
            .ok_or_else(|| AppError::NotFound("User not found".into()))?;

        let mut active: users::ActiveModel = user.into();
        active.role = Set(role);
        let updated = active.update(db).await?;
        Ok(updated)
    }

    pub async fn force_reset_password(
        db: &DatabaseConnection,
        user_id: &str,
        new_password: &str,
    ) -> Result<(), AppError> {
        let user = users::Entity::find_by_id(user_id)
            .one(db)
            .await?
            .ok_or_else(|| AppError::NotFound("User not found".into()))?;

        let password_hash = hash_password(new_password)
            .map_err(|e| AppError::Internal(format!("Hash error: {e}")))?;
        let mut active: users::ActiveModel = user.into();
        active.password_hash = Set(password_hash);
        active.update(db).await?;
        Ok(())
    }

    pub async fn delete_user(db: &DatabaseConnection, user_id: &str) -> Result<(), AppError> {
        let user = users::Entity::find_by_id(user_id)
            .one(db)
            .await?
            .ok_or_else(|| AppError::NotFound("User not found".into()))?;

        if user.role == UserRole::Superadmin {
            return Err(AppError::Forbidden(
                "Cannot delete superadmin account".into(),
            ));
        }

        // Delete user sessions first
        sessions::Entity::delete_many()
            .filter(sessions::Column::UserId.eq(user_id))
            .exec(db)
            .await?;

        users::Entity::delete_by_id(user_id).exec(db).await?;
        Ok(())
    }

    // ── System Settings ──

    pub async fn get_system_settings(
        db: &DatabaseConnection,
    ) -> Result<system_settings::Model, AppError> {
        let row = system_settings::Entity::find().one(db).await?;
        match row {
            Some(s) => Ok(s),
            None => {
                // Create default settings
                let id = Uuid::new_v4().to_string();
                let now: DateTimeWithTimeZone = Utc::now().into();
                let active = system_settings::ActiveModel {
                    id: Set(id.clone()),
                    allow_registration: Set(true),
                    single_workspace_mode: Set(false),
                    created_at: Set(Some(now)),
                    updated_at: Set(Some(now)),
                };
                system_settings::Entity::insert(active).exec(db).await?;
                system_settings::Entity::find_by_id(id)
                    .one(db)
                    .await?
                    .ok_or_else(|| AppError::Internal("Failed to create system settings".into()))
            }
        }
    }

    pub async fn update_system_settings(
        db: &DatabaseConnection,
        allow_registration: Option<bool>,
        single_workspace_mode: Option<bool>,
    ) -> Result<system_settings::Model, AppError> {
        let settings = Self::get_system_settings(db).await?;
        let mut active: system_settings::ActiveModel = settings.into();

        if let Some(v) = allow_registration {
            active.allow_registration = Set(v);
        }
        if let Some(v) = single_workspace_mode {
            active.single_workspace_mode = Set(v);
        }
        active.updated_at = Set(Some(Utc::now().into()));

        let updated = active.update(db).await?;
        Ok(updated)
    }

    // ── Invitation Codes ──

    pub async fn list_invitation_codes(
        db: &DatabaseConnection,
    ) -> Result<Vec<invitation_codes::Model>, AppError> {
        Ok(invitation_codes::Entity::find()
            .order_by_desc(invitation_codes::Column::CreatedAt)
            .all(db)
            .await?)
    }

    pub async fn create_invitation_code(
        db: &DatabaseConnection,
        created_by: &str,
        expires_in_hours: Option<f64>,
    ) -> Result<invitation_codes::Model, AppError> {
        let id = Uuid::new_v4().to_string();
        let code = Uuid::new_v4().to_string();
        let now = Utc::now();
        let expires_at = expires_in_hours
            .map(|h| (now + chrono::Duration::seconds((h * 3600.0) as i64)).into());

        let active = invitation_codes::ActiveModel {
            id: Set(id.clone()),
            code: Set(code),
            created_by: Set(created_by.to_string()),
            used_by: Set(None),
            used_at: Set(None),
            expires_at: Set(expires_at),
            created_at: Set(Some(now.into())),
        };
        invitation_codes::Entity::insert(active).exec(db).await?;
        invitation_codes::Entity::find_by_id(id)
            .one(db)
            .await?
            .ok_or_else(|| AppError::Internal("Failed to fetch created invitation code".into()))
    }

    pub async fn delete_invitation_code(
        db: &DatabaseConnection,
        code: &str,
    ) -> Result<(), AppError> {
        let row = invitation_codes::Entity::find()
            .filter(invitation_codes::Column::Code.eq(code))
            .one(db)
            .await?
            .ok_or_else(|| AppError::NotFound("Invitation code not found".into()))?;

        invitation_codes::Entity::delete_by_id(row.id)
            .exec(db)
            .await?;
        Ok(())
    }
}
