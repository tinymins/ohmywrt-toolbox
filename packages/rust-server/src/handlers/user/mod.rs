use std::sync::Arc;

use axum::extract::State;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde::Deserialize;

use crate::db::repos::user_repo::UserRepo;
use crate::error::{ApiResponse, AppError};
use crate::handlers::auth::UserDto;
use crate::handlers::auth::AuthUser;
use crate::AppState;

pub async fn get_profile(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
) -> Response {
    let user = match UserRepo::get_by_id(&state.db, &auth_user.user_id).await {
        Ok(Some(u)) => u,
        Ok(None) => return AppError::NotFound("user not found".into()).into_response(),
        Err(e) => return e.into_response(),
    };

    Json(ApiResponse {
        success: true,
        data: Some(UserDto::from(user)),
        error: None,
    })
    .into_response()
}

#[derive(Deserialize)]
pub struct UserUpdateInput {
    pub name: Option<String>,
    pub email: Option<String>,
    pub settings: Option<serde_json::Value>,
}

pub async fn update_profile(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Json(body): Json<UserUpdateInput>,
) -> Response {
    let user = match UserRepo::update_profile(
        &state.db,
        &auth_user.user_id,
        body.name.as_deref(),
        body.email.as_deref(),
        body.settings,
    )
    .await
    {
        Ok(u) => u,
        Err(e) => return e.into_response(),
    };

    Json(ApiResponse {
        success: true,
        data: Some(UserDto::from(user)),
        error: None,
    })
    .into_response()
}

pub async fn delete_avatar(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
) -> Response {
    let user = match UserRepo::clear_avatar_key(&state.db, &auth_user.user_id).await {
        Ok(u) => u,
        Err(e) => return e.into_response(),
    };

    Json(ApiResponse {
        success: true,
        data: Some(UserDto::from(user)),
        error: None,
    })
    .into_response()
}
