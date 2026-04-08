use axum::{middleware, Router};
use std::{env, sync::Arc};
use tower_http::services::{ServeDir, ServeFile};

use crate::middleware::request_timeout;
use crate::AppState;

mod admin;
mod auth;
mod cors;
mod network;
mod proxy;
mod storage;
mod user;
mod workspace;

pub fn build_app(state: Arc<AppState>) -> Router {
    let api = Router::new()
        .merge(auth::build_auth_routes())
        .merge(user::build_user_routes())
        .merge(workspace::build_workspace_routes())
        .merge(admin::build_admin_routes())
        .merge(storage::build_storage_routes())
        .merge(proxy::build_proxy_routes())
        .merge(network::build_network_routes())
        .layer(cors::build_cors_layer())
        .layer(middleware::from_fn(request_timeout))
        .with_state(state);

    // 生产模式：STATIC_DIR 设置时，服务器直接提供前端静态文件（SPA fallback）
    if let Ok(static_dir) = env::var("STATIC_DIR") {
        let index = format!("{static_dir}/index.html");
        api.fallback_service(ServeDir::new(&static_dir).fallback(ServeFile::new(index)))
    } else {
        api
    }
}
