use std::sync::Arc;

use axum::extract::State;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde::{Deserialize, Serialize};

use crate::db::repos::admin_repo::AdminRepo;
use crate::error::{ApiResponse, AppError};
use crate::handlers::auth::settings::resolve_single_workspace_mode;
use crate::handlers::auth::AuthUser;
use crate::AppState;

use super::require_admin;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemSettingsOutput {
    pub allow_registration: bool,
    pub single_workspace_mode: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub single_workspace_mode_overridden: Option<bool>,
}

pub async fn get_settings(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
) -> Result<Response, AppError> {
    require_admin(&auth_user)?;

    let settings = AdminRepo::get_system_settings(&state.db).await?;
    let (effective_single, is_overridden) =
        resolve_single_workspace_mode(settings.single_workspace_mode);

    Ok(Json(ApiResponse {
        success: true,
        data: Some(SystemSettingsOutput {
            allow_registration: settings.allow_registration,
            single_workspace_mode: effective_single,
            single_workspace_mode_overridden: if is_overridden { Some(true) } else { None },
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

    // If env var overrides single workspace mode, ignore the update for that field
    let (_, is_overridden) = resolve_single_workspace_mode(false);
    let effective_single_input = if is_overridden {
        None
    } else {
        input.single_workspace_mode
    };

    let settings = AdminRepo::update_system_settings(
        &state.db,
        input.allow_registration,
        effective_single_input,
    )
    .await?;

    let (effective_single, is_overridden) =
        resolve_single_workspace_mode(settings.single_workspace_mode);

    Ok(Json(ApiResponse {
        success: true,
        data: Some(SystemSettingsOutput {
            allow_registration: settings.allow_registration,
            single_workspace_mode: effective_single,
            single_workspace_mode_overridden: if is_overridden { Some(true) } else { None },
        }),
        error: None,
    })
    .into_response())
}
