use axum::routing::get;
use axum::Router;
use std::sync::Arc;

use crate::handlers::network;
use crate::AppState;

pub fn build_network_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/api/public/network/geoip/cn", get(network::geoip_cn))
        .route("/api/public/network/geosite/cn", get(network::geosite_cn))
}
