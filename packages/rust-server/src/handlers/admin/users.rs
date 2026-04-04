use std::sync::Arc;

use axum::extract::State;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde::{Deserialize, Serialize};

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

fn validate_role(s: &str) -> Result<&str, AppError> {
    match s {
        "superadmin" | "admin" | "user" => Ok(s),
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
        let last_login = AdminRepo::get_last_login_at(&state.db, &user.id.to_string()).await?;
        outputs.push(AdminUserOutput {
            id: user.id.to_string(),
            name: user.name.clone(),
            email: user.email.clone(),
            role: user.role.clone(),
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
        Some(r) => validate_role(r)?,
        None => "user",
    };

    let user = AdminRepo::create_user(&state.db, &input.name, &input.email, &input.password, role)
        .await?;

    let output = AdminUserOutput {
        id: user.id.to_string(),
        name: user.name.clone(),
        email: user.email.clone(),
        role: user.role.clone(),
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

    let role = validate_role(&input.role)?;
    let user = AdminRepo::update_user_role(&state.db, &input.user_id, role).await?;

    let last_login = AdminRepo::get_last_login_at(&state.db, &user.id.to_string()).await?;
    let output = AdminUserOutput {
        id: user.id.to_string(),
        name: user.name.clone(),
        email: user.email.clone(),
        role: user.role.clone(),
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
