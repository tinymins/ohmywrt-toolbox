use axum::body::Body;
use axum::extract::{Path, State};
use axum::http::{HeaderValue, StatusCode, header};
use axum::response::{IntoResponse, Response};
use std::sync::Arc;
use tracing::debug;

use crate::AppState;

/// GET /storage/{*key}
///
/// Serve files from object storage with long cache headers.
pub async fn storage_proxy(
    State(state): State<Arc<AppState>>,
    Path(key): Path<String>,
) -> Response {
    if key.is_empty() || key.contains("..") {
        return StatusCode::BAD_REQUEST.into_response();
    }

    let data = match state.storage.download(&key).await {
        Ok(d) => d,
        Err(_) => return StatusCode::NOT_FOUND.into_response(),
    };

    let content_type = mime_guess::from_path(&key)
        .first_raw()
        .unwrap_or("application/octet-stream");

    debug!("storage_proxy: key={key}, size={}, type={content_type}", data.len());

    Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, content_type)
        .header(
            header::CACHE_CONTROL,
            HeaderValue::from_static("public, max-age=31536000, immutable"),
        )
        .body(Body::from(data))
        .unwrap_or_else(|_| StatusCode::INTERNAL_SERVER_ERROR.into_response())
}
