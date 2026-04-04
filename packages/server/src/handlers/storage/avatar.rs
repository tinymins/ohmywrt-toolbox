use axum::extract::{Multipart, State};
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use std::sync::Arc;
use tracing::debug;
use uuid::Uuid;

use crate::AppState;
use crate::services::storage::UploadOptions;

/// JSON response helpers
fn ok_json(value: serde_json::Value) -> Response {
    (
        StatusCode::OK,
        axum::Json(serde_json::json!({ "success": true, "data": value })),
    )
        .into_response()
}

fn err_json(status: StatusCode, message: String) -> Response {
    (
        status,
        axum::Json(serde_json::json!({ "success": false, "error": message })),
    )
        .into_response()
}

/// POST /upload/avatar
///
/// multipart/form-data, field name "file".
/// Returns `{ success: true, data: { key: "avatars/{uuid}.{ext}" } }`.
pub async fn upload_avatar(
    State(state): State<Arc<AppState>>,
    mut multipart: Multipart,
) -> Response {
    let field = match multipart.next_field().await {
        Ok(Some(f)) => f,
        Ok(None) => return err_json(StatusCode::BAD_REQUEST, "No file provided".into()),
        Err(e) => {
            return err_json(StatusCode::BAD_REQUEST, format!("Multipart error: {e}"))
        }
    };

    let content_type = field
        .content_type()
        .unwrap_or("application/octet-stream")
        .to_string();

    if !content_type.starts_with("image/") {
        return err_json(
            StatusCode::BAD_REQUEST,
            "Only image files are accepted".into(),
        );
    }

    let data = match field.bytes().await {
        Ok(b) => b,
        Err(e) => {
            return err_json(StatusCode::BAD_REQUEST, format!("Failed to read file: {e}"))
        }
    };

    // Max 5MB
    if data.len() > 5 * 1024 * 1024 {
        return err_json(StatusCode::BAD_REQUEST, "File too large (max 5MB)".into());
    }

    let ext = content_type
        .strip_prefix("image/")
        .and_then(|s| s.split('+').next())
        .unwrap_or("bin");
    let key = format!("avatars/{}.{}", Uuid::new_v4(), ext);

    debug!(
        "Uploading avatar: key={key}, size={}, type={content_type}",
        data.len()
    );

    let options = UploadOptions {
        content_type: Some(content_type),
    };

    match state
        .storage
        .upload(&key, bytes::Bytes::from(data.to_vec()), Some(options))
        .await
    {
        Ok(()) => ok_json(serde_json::json!({ "key": key })),
        Err(e) => err_json(
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Upload failed: {e}"),
        ),
    }
}
