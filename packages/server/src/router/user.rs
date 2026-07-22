use axum::Router;
use axum::routing::{delete, get, patch, post};
use std::sync::Arc;

use crate::AppState;
use crate::handlers::user;

pub fn build_user_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/api/user/profile", get(user::get_profile))
        .route("/api/user/profile", patch(user::update_profile))
        .route("/api/user/avatar", delete(user::delete_avatar))
        .route("/api/user/change-password", post(user::change_password))
}
