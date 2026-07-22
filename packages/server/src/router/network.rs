use axum::Router;
use axum::routing::get;
use std::sync::Arc;

use crate::AppState;
use crate::handlers::network;

pub fn build_network_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/api/public/network/geoip/cn", get(network::geoip_cn))
        .route("/api/public/network/geosite/cn", get(network::geosite_cn))
}
