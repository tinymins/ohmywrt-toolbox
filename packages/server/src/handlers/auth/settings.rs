use std::sync::Arc;

use axum::extract::State;
use axum::http::{header, HeaderMap};
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde::Serialize;

use crate::db::entities::system_settings;
use crate::db::repos::admin_repo::AdminRepo;
use crate::db::repos::auth_repo::AuthRepo;
use crate::error::ApiResponse;
use crate::AppState;

use super::parse_session_cookie;

pub async fn logout(State(state): State<Arc<AppState>>, headers: HeaderMap) -> Response {
    let session_id = parse_session_cookie(&headers);
    if let Some(sid) = session_id {
        let _ = AuthRepo::delete_session(&state.db, &sid).await;
    }

    let clear_cookie =
        "SESSION_ID=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT";
    let body = Json(ApiResponse {
        success: true,
        data: Some(serde_json::json!({ "success": true })),
        error: None,
    });
    let mut resp = body.into_response();
    resp.headers_mut()
        .insert(header::SET_COOKIE, clear_cookie.parse().unwrap());
    resp
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemSettingsOutput {
    pub allow_registration: bool,
    pub single_workspace_mode: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub single_workspace_mode_overridden: Option<bool>,
}

/// Check if SINGLE_WORKSPACE_MODE_OVERRIDE env var is set.
/// Returns (effective_value, is_overridden).
pub fn resolve_single_workspace_mode(db_value: bool) -> (bool, bool) {
    match std::env::var("SINGLE_WORKSPACE_MODE_OVERRIDE").ok().as_deref() {
        Some("true") => (true, true),
        Some("false") => (false, true),
        _ => (db_value, false),
    }
}

pub async fn system_settings(State(state): State<Arc<AppState>>) -> Response {
    use sea_orm::EntityTrait;

    let row = system_settings::Entity::find()
        .one(&state.db)
        .await
        .ok()
        .flatten();

    let (db_allow, db_single) = match &row {
        Some(s) => (s.allow_registration, s.single_workspace_mode),
        None => (true, false),
    };

    let (effective_single, is_overridden) = resolve_single_workspace_mode(db_single);

    let output = SystemSettingsOutput {
        allow_registration: db_allow,
        single_workspace_mode: effective_single,
        single_workspace_mode_overridden: if is_overridden { Some(true) } else { None },
    };

    Json(ApiResponse {
        success: true,
        data: Some(output),
        error: None,
    })
    .into_response()
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RegistrationStatusOutput {
    pub allowed: bool,
    pub is_first_user: bool,
}

pub async fn registration_status(State(state): State<Arc<AppState>>) -> Response {
    let user_count = match AuthRepo::count_users(&state.db).await {
        Ok(n) => n,
        Err(e) => return e.into_response(),
    };
    let is_first_user = user_count == 0;

    let settings = AdminRepo::get_system_settings(&state.db).await;
    let allowed = match settings {
        Ok(s) => s.allow_registration || is_first_user,
        Err(_) => is_first_user,
    };

    Json(ApiResponse {
        success: true,
        data: Some(RegistrationStatusOutput {
            allowed,
            is_first_user,
        }),
        error: None,
    })
    .into_response()
}
