use chrono::Utc;
use sea_orm::prelude::DateTimeWithTimeZone;
use sea_orm::*;
use uuid::Uuid;

use crate::db::entities::{
    invitation_codes, sessions, system_settings, users, workspace_members, workspaces,
};
use crate::error::{parse_uuid, AppError};
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
        let uid = parse_uuid(user_id)?;
        let row = sessions::Entity::find()
            .filter(sessions::Column::UserId.eq(uid))
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
        role: &str,
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
        let user_id = Uuid::new_v4();
        let user_active = users::ActiveModel {
            id: Set(user_id),
            name: Set(name.to_string()),
            email: Set(email.to_string()),
            password_hash: Set(password_hash),
            role: Set(role.to_string()),
            settings: Set(None),
            created_at: Set(Some(Utc::now().into())),
        };
        users::Entity::insert(user_active).exec(db).await?;

        // Auto-create personal workspace
        let workspace_name = format!("{name}'s workspace");
        let base_slug = name
            .to_lowercase()
            .trim()
            .replace(|c: char| !c.is_alphanumeric() && c != '-', "-");
        let base_slug = if base_slug.is_empty() {
            "workspace".to_string()
        } else {
            base_slug
        };

        // Ensure unique slug
        let mut slug = base_slug.clone();
        let mut suffix = 1u32;
        loop {
            let existing = workspaces::Entity::find()
                .filter(workspaces::Column::Slug.eq(&slug))
                .one(db)
                .await?;
            if existing.is_none() {
                break;
            }
            slug = format!("{base_slug}-{suffix}");
            suffix += 1;
        }

        let ws_id = Uuid::new_v4();
        let ws_active = workspaces::ActiveModel {
            id: Set(ws_id),
            slug: Set(slug),
            name: Set(workspace_name),
            description: Set(None),
            owner_id: Set(Some(user_id)),
            created_at: Set(Some(Utc::now().into())),
        };
        workspaces::Entity::insert(ws_active).exec(db).await?;

        let member_active = workspace_members::ActiveModel {
            id: Set(Uuid::new_v4()),
            workspace_id: Set(ws_id),
            user_id: Set(user_id),
            role: Set("owner".to_string()),
            created_at: Set(Some(Utc::now().into())),
        };
        workspace_members::Entity::insert(member_active)
            .exec(db)
            .await?;

        users::Entity::find_by_id(user_id)
            .one(db)
            .await?
            .ok_or_else(|| AppError::Internal("Failed to fetch created user".into()))
    }

    pub async fn update_user_role(
        db: &DatabaseConnection,
        user_id: &str,
        role: &str,
    ) -> Result<users::Model, AppError> {
        let uid = parse_uuid(user_id)?;
        let user = users::Entity::find_by_id(uid)
            .one(db)
            .await?
            .ok_or_else(|| AppError::NotFound("User not found".into()))?;

        let mut active: users::ActiveModel = user.into();
        active.role = Set(role.to_string());
        let updated = active.update(db).await?;
        Ok(updated)
    }

    pub async fn force_reset_password(
        db: &DatabaseConnection,
        user_id: &str,
        new_password: &str,
    ) -> Result<(), AppError> {
        let uid = parse_uuid(user_id)?;
        let user = users::Entity::find_by_id(uid)
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
        let uid = parse_uuid(user_id)?;
        let user = users::Entity::find_by_id(uid)
            .one(db)
            .await?
            .ok_or_else(|| AppError::NotFound("User not found".into()))?;

        if user.role == "superadmin" {
            return Err(AppError::Forbidden(
                "Cannot delete superadmin account".into(),
            ));
        }

        // 1. Delete user's sessions
        sessions::Entity::delete_many()
            .filter(sessions::Column::UserId.eq(uid))
            .exec(db)
            .await?;

        // 2. Get workspaces owned by user
        let owned_workspaces = workspaces::Entity::find()
            .filter(workspaces::Column::OwnerId.eq(uid))
            .all(db)
            .await?;

        let owned_ws_ids: Vec<Uuid> = owned_workspaces.iter().map(|w| w.id).collect();

        if !owned_ws_ids.is_empty() {
            // 3. Delete members of owned workspaces
            workspace_members::Entity::delete_many()
                .filter(workspace_members::Column::WorkspaceId.is_in(owned_ws_ids.clone()))
                .exec(db)
                .await?;

            // 4. Delete owned workspaces
            workspaces::Entity::delete_many()
                .filter(workspaces::Column::Id.is_in(owned_ws_ids))
                .exec(db)
                .await?;
        }

        // 5. Delete user's memberships in other workspaces
        workspace_members::Entity::delete_many()
            .filter(workspace_members::Column::UserId.eq(uid))
            .exec(db)
            .await?;

        // 6. Delete user
        users::Entity::delete_by_id(uid).exec(db).await?;
        Ok(())
    }

    // ── System Settings ──

    pub async fn get_system_settings(
        db: &DatabaseConnection,
    ) -> Result<system_settings::Model, AppError> {
        let row = system_settings::Entity::find().one(db).await?;
        if let Some(s) = row {
            return Ok(s);
        }
        // Create default settings
        let id = Uuid::new_v4();
        let now: DateTimeWithTimeZone = Utc::now().into();
        let active = system_settings::ActiveModel {
            id: Set(id),
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
        let creator_id = parse_uuid(created_by)?;
        let id = Uuid::new_v4();
        let code = Uuid::new_v4().to_string();
        let now = Utc::now();
        let expires_at = expires_in_hours
            .map(|h| (now + chrono::Duration::seconds((h * 3600.0) as i64)).into());

        let active = invitation_codes::ActiveModel {
            id: Set(id),
            code: Set(code),
            created_by: Set(creator_id),
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

    pub async fn validate_invitation_code(
        db: &DatabaseConnection,
        code: &str,
    ) -> Result<Option<invitation_codes::Model>, AppError> {
        let row = invitation_codes::Entity::find()
            .filter(invitation_codes::Column::Code.eq(code))
            .filter(invitation_codes::Column::UsedBy.is_null())
            .one(db)
            .await?;
        Ok(row)
    }

    pub async fn use_invitation_code(
        db: &DatabaseConnection,
        code: &str,
        used_by: &str,
    ) -> Result<(), AppError> {
        let user_id = parse_uuid(used_by)?;
        let row = invitation_codes::Entity::find()
            .filter(invitation_codes::Column::Code.eq(code))
            .one(db)
            .await?
            .ok_or_else(|| AppError::NotFound("Invitation code not found".into()))?;

        let mut active: invitation_codes::ActiveModel = row.into();
        active.used_by = Set(Some(user_id));
        active.used_at = Set(Some(Utc::now().into()));
        active.update(db).await?;
        Ok(())
    }
}
