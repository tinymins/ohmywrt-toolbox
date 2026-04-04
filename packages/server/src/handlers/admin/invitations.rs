use std::sync::Arc;

use axum::extract::State;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde::{Deserialize, Serialize};

use crate::db::repos::admin_repo::AdminRepo;
use crate::error::{ApiResponse, AppError};
use crate::handlers::auth::AuthUser;
use crate::AppState;

use super::require_superadmin;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InvitationCodeOutput {
    pub id: String,
    pub code: String,
    pub created_by: String,
    pub used_by: Option<String>,
    pub used_at: Option<String>,
    pub expires_at: Option<String>,
    pub created_at: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerateInvitationInput {
    pub expires_in_hours: Option<f64>,
}

pub async fn list_codes(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
) -> Result<Response, AppError> {
    require_superadmin(&auth_user)?;

    let codes = AdminRepo::list_invitation_codes(&state.db).await?;
    let outputs: Vec<InvitationCodeOutput> = codes
        .into_iter()
        .map(|c| InvitationCodeOutput {
            id: c.id.to_string(),
            code: c.code,
            created_by: c.created_by.to_string(),
            used_by: c.used_by.map(|u| u.to_string()),
            used_at: c.used_at.map(|dt| dt.to_rfc3339()),
            expires_at: c.expires_at.map(|dt| dt.to_rfc3339()),
            created_at: c
                .created_at
                .map(|dt| dt.to_rfc3339())
                .unwrap_or_default(),
        })
        .collect();

    Ok(Json(ApiResponse {
        success: true,
        data: Some(outputs),
        error: None,
    })
    .into_response())
}

pub async fn generate_code(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Json(input): Json<GenerateInvitationInput>,
) -> Result<Response, AppError> {
    require_superadmin(&auth_user)?;

    let code =
        AdminRepo::create_invitation_code(&state.db, &auth_user.user_id, input.expires_in_hours)
            .await?;

    let output = InvitationCodeOutput {
        id: code.id.to_string(),
        code: code.code,
        created_by: code.created_by.to_string(),
        used_by: code.used_by.map(|u| u.to_string()),
        used_at: code.used_at.map(|dt| dt.to_rfc3339()),
        expires_at: code.expires_at.map(|dt| dt.to_rfc3339()),
        created_at: code
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

pub async fn delete_code(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    axum::extract::Path(code): axum::extract::Path<String>,
) -> Result<Response, AppError> {
    require_superadmin(&auth_user)?;

    AdminRepo::delete_invitation_code(&state.db, &code).await?;

    Ok(Json(ApiResponse::<()> {
        success: true,
        data: None,
        error: None,
    })
    .into_response())
}
