use axum::routing::{get, post};
use axum::Router;
use std::sync::Arc;

use crate::handlers::proxy;
use crate::AppState;

pub fn build_proxy_routes() -> Router<Arc<AppState>> {
    Router::new()
        // Authenticated endpoints
        .route(
            "/api/proxy/subscribes",
            get(proxy::list_subscribes).post(proxy::create_subscribe),
        )
        .route(
            "/api/proxy/subscribes/{id}",
            get(proxy::get_subscribe)
                .patch(proxy::update_subscribe)
                .delete(proxy::delete_subscribe),
        )
        .route(
            "/api/proxy/subscribes/{id}/stats",
            get(proxy::get_subscribe_stats),
        )
        .route(
            "/api/proxy/subscribes/{id}/preview-nodes",
            get(proxy::preview_nodes),
        )
        .route(
            "/api/proxy/subscribes/{id}/trace-node",
            get(proxy::trace_node),
        )
        .route("/api/proxy/defaults", get(proxy::get_defaults))
        .route("/api/proxy/user-stats", get(proxy::get_user_stats))
        .route("/api/proxy/debug", post(proxy::debug_proxy))
        .route("/api/proxy/clear-cache", post(proxy::clear_cache))
        // Public endpoints (no auth) — /{uuid}/{format}
        .route(
            "/api/public/proxy/{uuid}/clash",
            get(proxy::public_clash),
        )
        .route(
            "/api/public/proxy/{uuid}/clash-meta",
            get(proxy::public_clash_meta),
        )
        .route(
            "/api/public/proxy/{uuid}/sing-box",
            get(proxy::public_sing_box),
        )
        .route(
            "/api/public/proxy/{uuid}/sing-box/12",
            get(proxy::public_sing_box_v12),
        )
}
