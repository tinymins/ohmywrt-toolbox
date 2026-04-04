use std::sync::Arc;

use axum::routing::{delete, get, patch, post};
use axum::Router;

use crate::handlers::admin;
use crate::AppState;

pub fn build_admin_routes() -> Router<Arc<AppState>> {
    Router::new()
        // User management
        .route("/api/admin/users", get(admin::users::list_users))
        .route("/api/admin/users", post(admin::users::create_user))
        .route(
            "/api/admin/users/role",
            patch(admin::users::update_user_role),
        )
        .route(
            "/api/admin/users/reset-password",
            post(admin::users::force_reset_password),
        )
        .route(
            "/api/admin/users/{userId}",
            delete(admin::users::delete_user),
        )
        // System settings
        .route("/api/admin/settings", get(admin::settings::get_settings))
        .route(
            "/api/admin/settings",
            patch(admin::settings::update_settings),
        )
        // Invitation codes
        .route(
            "/api/admin/invitation-codes",
            get(admin::invitations::list_codes),
        )
        .route(
            "/api/admin/invitation-codes",
            post(admin::invitations::generate_code),
        )
        .route(
            "/api/admin/invitation-codes/{code}",
            delete(admin::invitations::delete_code),
        )
}
