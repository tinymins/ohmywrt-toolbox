use axum::Router;
use axum::routing::{get, post};
use std::sync::Arc;

use crate::AppState;
use crate::handlers::storage::{storage_proxy, upload_avatar};

pub fn build_storage_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/upload/avatar", post(upload_avatar))
        .route("/storage/{*key}", get(storage_proxy))
}
