use std::sync::Arc;

use axum::extract::State;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde::{Deserialize, Serialize};

use crate::db::repos::admin_repo::AdminRepo;
use crate::error::{ApiResponse, AppError};
use crate::handlers::auth::AuthUser;
use crate::AppState;

use super::require_admin;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemSettingsOutput {
    pub allow_registration: bool,
    pub single_workspace_mode: bool,
}

pub async fn get_settings(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
) -> Result<Response, AppError> {
    require_admin(&auth_user)?;

    let settings = AdminRepo::get_system_settings(&state.db).await?;

    Ok(Json(ApiResponse {
        success: true,
        data: Some(SystemSettingsOutput {
            allow_registration: settings.allow_registration,
            single_workspace_mode: settings.single_workspace_mode,
        }),
        error: None,
    })
    .into_response())
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSettingsInput {
    pub allow_registration: Option<bool>,
    pub single_workspace_mode: Option<bool>,
}

pub async fn update_settings(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Json(input): Json<UpdateSettingsInput>,
) -> Result<Response, AppError> {
    require_admin(&auth_user)?;

    let settings = AdminRepo::update_system_settings(
        &state.db,
        input.allow_registration,
        input.single_workspace_mode,
    )
    .await?;

    Ok(Json(ApiResponse {
        success: true,
        data: Some(SystemSettingsOutput {
            allow_registration: settings.allow_registration,
            single_workspace_mode: settings.single_workspace_mode,
        }),
        error: None,
    })
    .into_response())
}
