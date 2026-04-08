use axum::http::{
    header::{
        ACCEPT, ACCEPT_LANGUAGE, AUTHORIZATION, CONTENT_LANGUAGE, CONTENT_TYPE, ORIGIN, RANGE,
    },
    HeaderName, HeaderValue, Method,
};
use std::env;
use tower_http::cors::{AllowOrigin, CorsLayer};
use tracing::warn;

const DEFAULT_CORS_ALLOWED_ORIGINS: [&str; 2] = ["http://localhost:5173", "http://127.0.0.1:5173"];

fn default_cors_allowed_origins() -> Vec<HeaderValue> {
    DEFAULT_CORS_ALLOWED_ORIGINS
        .into_iter()
        .map(HeaderValue::from_static)
        .collect()
}

fn parse_cors_allowed_origins() -> Vec<HeaderValue> {
    let Ok(configured) = env::var("CORS_ALLOWED_ORIGINS") else {
        return default_cors_allowed_origins();
    };

    let origins = configured
        .split(',')
        .filter_map(|origin| {
            let trimmed = origin.trim();
            if trimmed.is_empty() {
                return None;
            }

            match HeaderValue::from_str(trimmed) {
                Ok(value) => Some(value),
                Err(error) => {
                    warn!(
                        origin = trimmed,
                        error = %error,
                        "ignoring invalid CORS_ALLOWED_ORIGINS entry"
                    );
                    None
                }
            }
        })
        .collect::<Vec<_>>();

    if origins.is_empty() {
        warn!(
            "CORS_ALLOWED_ORIGINS did not contain any valid entries; falling back to localhost defaults"
        );
        return default_cors_allowed_origins();
    }

    origins
}

pub fn build_cors_layer() -> CorsLayer {
    CorsLayer::new()
        .allow_origin(AllowOrigin::list(parse_cors_allowed_origins()))
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::PUT,
            Method::PATCH,
            Method::DELETE,
            Method::OPTIONS,
        ])
        .allow_headers([
            ACCEPT,
            ACCEPT_LANGUAGE,
            AUTHORIZATION,
            CONTENT_LANGUAGE,
            CONTENT_TYPE,
            ORIGIN,
            RANGE,
            HeaderName::from_static("x-lang"),
        ])
        .allow_credentials(true)
}
