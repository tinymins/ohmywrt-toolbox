use std::sync::Arc;

use axum::extract::State;
use axum::http::header;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde::{Deserialize, Serialize};

use crate::db::entities::users;
use crate::db::repos::auth_repo::AuthRepo;
use crate::db::repos::workspace_repo::WorkspaceRepo;
use crate::error::{ApiResponse, AppError};
use crate::services::auth::verify_password;
use crate::AppState;

#[derive(Deserialize)]
pub struct LoginInput {
    pub email: String,
    pub password: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AuthOutput {
    pub user: UserDto,
    pub default_workspace_slug: String,
}

#[derive(Serialize)]
pub struct UserDto {
    pub id: String,
    pub name: String,
    pub email: String,
    pub role: String,
    pub settings: Option<serde_json::Value>,
}

impl From<users::Model> for UserDto {
    fn from(u: users::Model) -> Self {
        Self {
            id: u.id.to_string(),
            name: u.name,
            email: u.email,
            role: u.role,
            settings: u.settings,
        }
    }
}

pub async fn login(
    State(state): State<Arc<AppState>>,
    Json(body): Json<LoginInput>,
) -> Response {
    let user = match AuthRepo::find_user_by_email(&state.db, &body.email).await {
        Ok(Some(u)) => u,
        Ok(None) => return AppError::BadRequest("邮箱或密码错误".into()).into_response(),
        Err(e) => return e.into_response(),
    };

    if !verify_password(&body.password, &user.password_hash) {
        return AppError::BadRequest("邮箱或密码错误".into()).into_response();
    }

    let user_id_str = user.id.to_string();
    let session_id = match AuthRepo::create_session(&state.db, &user_id_str).await {
        Ok(s) => s,
        Err(e) => return e.into_response(),
    };

    let workspace = match WorkspaceRepo::get_first_by_user(&state.db, &user_id_str).await {
        Ok(Some(ws)) => ws,
        Ok(None) => {
            // No workspace — create a default one
            match WorkspaceRepo::create_with_owner(
                &state.db,
                "Default",
                "default",
                &user_id_str,
            )
            .await
            {
                Ok(ws) => ws,
                Err(e) => return e.into_response(),
            }
        }
        Err(e) => return e.into_response(),
    };

    let output = AuthOutput {
        user: UserDto::from(user),
        default_workspace_slug: workspace.slug,
    };

    build_session_response(output, &session_id)
}

pub fn build_session_response<T: Serialize>(data: T, session_id: &str) -> Response {
    let secure = std::env::var("NODE_ENV")
        .map(|v| v == "production")
        .unwrap_or(false);
    let cookie = format!(
        "SESSION_ID={}; HttpOnly; SameSite=Lax; Path=/; Max-Age={}{}",
        session_id,
        604_800, // 7 days
        if secure { "; Secure" } else { "" }
    );
    let body = Json(ApiResponse {
        success: true,
        data: Some(data),
        error: None,
    });
    let mut resp = body.into_response();
    resp.headers_mut()
        .insert(header::SET_COOKIE, cookie.parse().unwrap());
    resp
}
