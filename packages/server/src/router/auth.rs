use axum::routing::{get, post};
use axum::Router;
use std::sync::Arc;

use crate::handlers::auth;
use crate::AppState;

pub fn build_auth_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/api/auth/login", post(auth::login))
        .route("/api/auth/register", post(auth::register))
        .route("/api/auth/logout", post(auth::logout))
        .route("/api/auth/system-settings", get(auth::system_settings))
        .route(
            "/api/auth/registration-status",
            get(auth::registration_status),
        )
}
