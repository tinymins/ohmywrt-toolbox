//! 中间件层。
//! 扩展点：auth_middleware、rate_limit_middleware、path_parse_middleware …

use std::{env, sync::OnceLock, time::Duration};

use axum::{
    extract::Request,
    http::StatusCode,
    middleware::Next,
    response::{IntoResponse, Response},
    Json,
};

use crate::error::ApiResponse;

const DEFAULT_REQUEST_TIMEOUT_SECS: u64 = 300;

fn request_timeout_duration() -> Duration {
    static REQUEST_TIMEOUT: OnceLock<Duration> = OnceLock::new();
    *REQUEST_TIMEOUT.get_or_init(|| {
        let secs = env::var("RUST_SOURCE_REQUEST_TIMEOUT_SECONDS")
            .ok()
            .and_then(|value| value.parse::<u64>().ok())
            .filter(|value| *value > 0)
            .unwrap_or(DEFAULT_REQUEST_TIMEOUT_SECS);
        Duration::from_secs(secs)
    })
}

pub async fn request_timeout(req: Request, next: Next) -> Response {
    let path = req.uri().path();
    if path.ends_with("/stream") || path.ends_with("/sse") || path.ends_with("/ws") {
        return next.run(req).await;
    }

    match tokio::time::timeout(request_timeout_duration(), next.run(req)).await {
        Ok(response) => response,
        Err(_) => (
            StatusCode::GATEWAY_TIMEOUT,
            Json(ApiResponse::<()> {
                success: false,
                data: None,
                error: Some("request timed out".into()),
            }),
        )
            .into_response(),
    }
}
