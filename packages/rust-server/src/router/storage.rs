use axum::routing::{get, post};
use axum::Router;
use std::sync::Arc;

use crate::handlers::storage::{storage_proxy, upload_avatar};
use crate::AppState;

pub fn build_storage_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/upload/avatar", post(upload_avatar))
        .route("/storage/{*key}", get(storage_proxy))
}
