mod login;
mod register;
mod settings;

pub use login::{login, AuthOutput, UserDto};
pub use register::register;
pub use settings::{logout, system_settings};

use std::sync::Arc;

use axum::extract::FromRequestParts;
use axum::http::HeaderMap;

use crate::db::entities::users::UserRole;
use crate::db::repos::auth_repo::AuthRepo;
use crate::db::repos::user_repo::UserRepo;
use crate::error::AppError;
use crate::AppState;

pub struct SessionAuth {
    pub user_id: String,
    pub session_id: String,
}

/// Axum extractor: reads SESSION_ID cookie, validates session, provides user_id + role.
pub struct AuthUser {
    pub user_id: String,
    pub session_id: String,
    pub role: UserRole,
}

impl FromRequestParts<Arc<AppState>> for AuthUser {
    type Rejection = AppError;

    async fn from_request_parts(
        parts: &mut axum::http::request::Parts,
        state: &Arc<AppState>,
    ) -> Result<Self, Self::Rejection> {
        let auth = extract_session_auth(&state.db, &parts.headers).await?;
        let user = UserRepo::get_by_id(&state.db, &auth.user_id)
            .await?
            .ok_or_else(|| AppError::Unauthorized("User not found".into()))?;
        Ok(AuthUser {
            user_id: auth.user_id,
            session_id: auth.session_id,
            role: user.role,
        })
    }
}

pub async fn extract_session_auth(
    db: &sea_orm::DatabaseConnection,
    headers: &HeaderMap,
) -> Result<SessionAuth, AppError> {
    let session_id =
        parse_session_cookie(headers).ok_or_else(|| AppError::Unauthorized("未登录".into()))?;

    let user_id = AuthRepo::get_user_id_by_session(db, &session_id)
        .await?
        .ok_or_else(|| AppError::Unauthorized("会话已失效，请重新登录".into()))?;

    Ok(SessionAuth {
        user_id,
        session_id,
    })
}

pub fn parse_session_cookie(headers: &HeaderMap) -> Option<String> {
    headers
        .get("cookie")
        .and_then(|v| v.to_str().ok())
        .and_then(|cookie_str| {
            cookie_str
                .split(';')
                .map(|s| s.trim())
                .find_map(|part| part.strip_prefix("SESSION_ID=").map(ToOwned::to_owned))
        })
}
