use std::sync::Arc;

use axum::extract::State;
use axum::response::{IntoResponse, Response};
use axum::Json;
use chrono::Utc;
use serde::Deserialize;

use crate::db::repos::admin_repo::AdminRepo;
use crate::db::repos::auth_repo::AuthRepo;
use crate::db::repos::workspace_repo::WorkspaceRepo;
use crate::error::AppError;
use crate::services::auth::hash_password;
use crate::AppState;

use super::login::{build_session_response, AuthOutput, UserDto};
use super::settings::resolve_single_workspace_mode;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RegisterInput {
    pub name: String,
    pub email: String,
    pub password: String,
    pub invitation_code: Option<String>,
}

/// Read the effective single_workspace_mode from DB + env override
async fn is_single_workspace_mode(db: &sea_orm::DatabaseConnection) -> bool {
    use crate::db::entities::system_settings;
    use sea_orm::EntityTrait;

    let row = system_settings::Entity::find().one(db).await.ok().flatten();
    let db_value = row.map(|s| s.single_workspace_mode).unwrap_or(false);
    let (effective, _) = resolve_single_workspace_mode(db_value);
    effective
}

pub async fn register(
    State(state): State<Arc<AppState>>,
    Json(body): Json<RegisterInput>,
) -> Response {
    // Count users to check if first user
    let user_count = match AuthRepo::count_users(&state.db).await {
        Ok(n) => n,
        Err(e) => return e.into_response(),
    };
    let is_first_user = user_count == 0;

    // Validate invitation code if provided
    let mut valid_invitation = false;
    if let Some(ref code) = body.invitation_code {
        match AdminRepo::validate_invitation_code(&state.db, code).await {
            Ok(Some(inv)) => {
                // Check if expired
                if let Some(expires_at) = inv.expires_at {
                    let now = Utc::now();
                    if now > expires_at {
                        return AppError::BadRequest("Invitation code has expired".into())
                            .into_response();
                    }
                }
                valid_invitation = true;
            }
            Ok(None) => {
                return AppError::BadRequest("Invalid or already used invitation code".into())
                    .into_response();
            }
            Err(e) => return e.into_response(),
        }
    }

    // Registration permission check
    if !is_first_user && !valid_invitation {
        let settings = AdminRepo::get_system_settings(&state.db).await;
        let allow = match settings {
            Ok(s) => s.allow_registration,
            Err(_) => false,
        };
        if !allow {
            return AppError::Forbidden("Registration is not allowed".into()).into_response();
        }
    }

    // Check if email is already taken
    match AuthRepo::find_user_by_email(&state.db, &body.email).await {
        Ok(Some(_)) => return AppError::Conflict("该邮箱已被注册".into()).into_response(),
        Err(e) => return e.into_response(),
        Ok(None) => {}
    }

    let password_hash = match hash_password(&body.password) {
        Ok(h) => h,
        Err(e) => return AppError::Internal(e).into_response(),
    };

    // First user becomes superadmin
    let role = if is_first_user {
        "superadmin"
    } else {
        "user"
    };

    let user =
        match AuthRepo::create_user(&state.db, &body.name, &body.email, &password_hash, role)
            .await
        {
            Ok(u) => u,
            Err(e) => return e.into_response(),
        };

    let user_id_str = user.id.to_string();

    // Create session
    let session_id = match AuthRepo::create_session(&state.db, &user_id_str).await {
        Ok(s) => s,
        Err(e) => return e.into_response(),
    };

    // Check single workspace mode
    let single_mode = is_single_workspace_mode(&state.db).await;

    let workspace = if single_mode {
        // Single workspace mode: join the shared workspace
        match WorkspaceRepo::get_or_create_shared(&state.db, &user_id_str).await {
            Ok(ws) => {
                // First member = owner (handled by get_or_create_shared), rest = member
                if let Err(e) = WorkspaceRepo::add_member(
                    &state.db,
                    &ws.id.to_string(),
                    &user_id_str,
                    "member",
                )
                .await
                {
                    return e.into_response();
                }
                ws
            }
            Err(e) => return e.into_response(),
        }
    } else {
        // Normal mode: create personal workspace
        let base_slug: String = body
            .name
            .to_lowercase()
            .trim()
            .chars()
            .map(|c| if c.is_alphanumeric() { c } else { '-' })
            .collect();
        let base_slug = base_slug.trim_matches('-').to_string();
        let base_slug = if base_slug.is_empty() {
            "workspace".to_string()
        } else {
            base_slug
        };

        let slug = match WorkspaceRepo::ensure_unique_slug(&state.db, &base_slug).await {
            Ok(s) => s,
            Err(e) => return e.into_response(),
        };

        match WorkspaceRepo::create_with_owner(
            &state.db,
            &format!("{}'s workspace", body.name),
            &slug,
            &user_id_str,
        )
        .await
        {
            Ok(ws) => ws,
            Err(e) => return e.into_response(),
        }
    };

    // If invitation code was used, mark it as used
    if let Some(ref code) = body.invitation_code {
        if valid_invitation {
            if let Err(e) = AdminRepo::use_invitation_code(&state.db, code, &user_id_str).await {
                return e.into_response();
            }
        }
    }

    let output = AuthOutput {
        user: UserDto::from(user),
        default_workspace_slug: workspace.slug,
    };

    build_session_response(output, &session_id)
}
