use std::sync::Arc;

use axum::extract::State;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde::{Deserialize, Serialize};

use crate::db::entities::users::UserRole;
use crate::db::repos::admin_repo::AdminRepo;
use crate::error::{ApiResponse, AppError};
use crate::handlers::auth::AuthUser;
use crate::AppState;

use super::{require_admin, require_superadmin};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdminUserOutput {
    pub id: String,
    pub name: String,
    pub email: String,
    pub role: String,
    pub last_login_at: Option<String>,
    pub created_at: String,
}

fn role_to_string(role: &UserRole) -> String {
    match role {
        UserRole::Superadmin => "superadmin".to_string(),
        UserRole::Admin => "admin".to_string(),
        UserRole::User => "user".to_string(),
    }
}

fn string_to_role(s: &str) -> Result<UserRole, AppError> {
    match s {
        "superadmin" => Ok(UserRole::Superadmin),
        "admin" => Ok(UserRole::Admin),
        "user" => Ok(UserRole::User),
        _ => Err(AppError::BadRequest(format!("Invalid role: {s}"))),
    }
}

pub async fn list_users(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
) -> Result<Response, AppError> {
    require_admin(&auth_user)?;

    let users = AdminRepo::list_all_users(&state.db).await?;
    let mut outputs = Vec::with_capacity(users.len());

    for user in &users {
        let last_login = AdminRepo::get_last_login_at(&state.db, &user.id).await?;
        outputs.push(AdminUserOutput {
            id: user.id.clone(),
            name: user.name.clone(),
            email: user.email.clone(),
            role: role_to_string(&user.role),
            last_login_at: last_login.map(|dt| dt.to_rfc3339()),
            created_at: user
                .created_at
                .map(|dt| dt.to_rfc3339())
                .unwrap_or_default(),
        });
    }

    Ok(Json(ApiResponse {
        success: true,
        data: Some(outputs),
        error: None,
    })
    .into_response())
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateUserInput {
    pub name: String,
    pub email: String,
    pub password: String,
    pub role: Option<String>,
}

pub async fn create_user(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Json(input): Json<CreateUserInput>,
) -> Result<Response, AppError> {
    require_superadmin(&auth_user)?;

    let role = match &input.role {
        Some(r) => string_to_role(r)?,
        None => UserRole::User,
    };

    let user = AdminRepo::create_user(&state.db, &input.name, &input.email, &input.password, role)
        .await?;

    let output = AdminUserOutput {
        id: user.id.clone(),
        name: user.name.clone(),
        email: user.email.clone(),
        role: role_to_string(&user.role),
        last_login_at: None,
        created_at: user
            .created_at
            .map(|dt| dt.to_rfc3339())
            .unwrap_or_default(),
    };

    Ok(Json(ApiResponse {
        success: true,
        data: Some(output),
        error: None,
    })
    .into_response())
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateUserRoleInput {
    pub user_id: String,
    pub role: String,
}

pub async fn update_user_role(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Json(input): Json<UpdateUserRoleInput>,
) -> Result<Response, AppError> {
    require_superadmin(&auth_user)?;

    if input.user_id == auth_user.user_id {
        return Err(AppError::BadRequest(
            "Cannot change your own role".into(),
        ));
    }

    let role = string_to_role(&input.role)?;
    let user = AdminRepo::update_user_role(&state.db, &input.user_id, role).await?;

    let last_login = AdminRepo::get_last_login_at(&state.db, &user.id).await?;
    let output = AdminUserOutput {
        id: user.id.clone(),
        name: user.name.clone(),
        email: user.email.clone(),
        role: role_to_string(&user.role),
        last_login_at: last_login.map(|dt| dt.to_rfc3339()),
        created_at: user
            .created_at
            .map(|dt| dt.to_rfc3339())
            .unwrap_or_default(),
    };

    Ok(Json(ApiResponse {
        success: true,
        data: Some(output),
        error: None,
    })
    .into_response())
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ForceResetPasswordInput {
    pub user_id: String,
    pub new_password: String,
}

pub async fn force_reset_password(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Json(input): Json<ForceResetPasswordInput>,
) -> Result<Response, AppError> {
    require_superadmin(&auth_user)?;

    if input.user_id == auth_user.user_id {
        return Err(AppError::BadRequest(
            "Please use profile settings to change your own password".into(),
        ));
    }

    AdminRepo::force_reset_password(&state.db, &input.user_id, &input.new_password).await?;

    Ok(Json(ApiResponse::<()> {
        success: true,
        data: None,
        error: None,
    })
    .into_response())
}

pub async fn delete_user(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    axum::extract::Path(user_id): axum::extract::Path<String>,
) -> Result<Response, AppError> {
    require_superadmin(&auth_user)?;

    if user_id == auth_user.user_id {
        return Err(AppError::BadRequest(
            "Cannot delete your own account".into(),
        ));
    }

    AdminRepo::delete_user(&state.db, &user_id).await?;

    Ok(Json(ApiResponse::<()> {
        success: true,
        data: None,
        error: None,
    })
    .into_response())
}
