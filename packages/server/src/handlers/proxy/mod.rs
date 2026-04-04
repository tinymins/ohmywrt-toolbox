use std::sync::Arc;

use axum::extract::{Path, State};
use axum::http::HeaderMap;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde::Serialize;

use crate::db::entities::{proxy_access_logs, proxy_subscribes};
use crate::db::repos::proxy_access_log_repo::ProxyAccessLogRepo;
use crate::db::repos::proxy_subscribe_repo::ProxySubscribeRepo;
use crate::error::{ApiResponse, AppError};
use crate::handlers::auth::AuthUser;
use crate::AppState;

// ─── Output types ───

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProxySubscribeOutput {
    pub id: String,
    pub user_id: String,
    pub url: String,
    pub remark: Option<String>,
    pub subscribe_url: Option<String>,
    pub subscribe_items: Option<serde_json::Value>,
    pub rule_list: Option<String>,
    pub use_system_rule_list: bool,
    pub group: Option<String>,
    pub use_system_group: bool,
    pub filter: Option<String>,
    pub use_system_filter: bool,
    pub servers: Option<String>,
    pub custom_config: Option<String>,
    pub use_system_custom_config: bool,
    pub dns_config: Option<String>,
    pub use_system_dns_config: bool,
    pub authorized_user_ids: Option<serde_json::Value>,
    pub cache_ttl_minutes: Option<i32>,
    pub cached_node_count: Option<i32>,
    pub last_access_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

impl From<proxy_subscribes::Model> for ProxySubscribeOutput {
    fn from(s: proxy_subscribes::Model) -> Self {
        Self {
            id: s.id.to_string(),
            user_id: s.user_id.to_string(),
            url: s.url,
            remark: s.remark,
            subscribe_url: s.subscribe_url,
            subscribe_items: s.subscribe_items,
            rule_list: s.rule_list,
            use_system_rule_list: s.use_system_rule_list,
            group: s.group,
            use_system_group: s.use_system_group,
            filter: s.filter,
            use_system_filter: s.use_system_filter,
            servers: s.servers,
            custom_config: s.custom_config,
            use_system_custom_config: s.use_system_custom_config,
            dns_config: s.dns_config,
            use_system_dns_config: s.use_system_dns_config,
            authorized_user_ids: s.authorized_user_ids,
            cache_ttl_minutes: s.cache_ttl_minutes,
            cached_node_count: s.cached_node_count,
            last_access_at: s.last_access_at.map(|dt| dt.to_rfc3339()),
            created_at: s
                .created_at
                .map(|dt| dt.to_rfc3339())
                .unwrap_or_default(),
            updated_at: s
                .updated_at
                .map(|dt| dt.to_rfc3339())
                .unwrap_or_default(),
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AccessLogOutput {
    pub id: String,
    pub subscribe_id: String,
    pub access_type: String,
    pub ip: Option<String>,
    pub user_agent: Option<String>,
    pub node_count: Option<i32>,
    pub created_at: String,
}

impl From<proxy_access_logs::Model> for AccessLogOutput {
    fn from(l: proxy_access_logs::Model) -> Self {
        Self {
            id: l.id.to_string(),
            subscribe_id: l.subscribe_id.to_string(),
            access_type: l.access_type,
            ip: l.ip,
            user_agent: l.user_agent,
            node_count: l.node_count,
            created_at: l
                .created_at
                .map(|dt| dt.to_rfc3339())
                .unwrap_or_default(),
        }
    }
}

// ─── Authenticated handlers ───

pub async fn list_subscribes(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
) -> Response {
    let subs = match ProxySubscribeRepo::list_by_user(&state.db, &auth_user.user_id).await {
        Ok(v) => v,
        Err(e) => return e.into_response(),
    };

    let output: Vec<ProxySubscribeOutput> =
        subs.into_iter().map(ProxySubscribeOutput::from).collect();
    Json(ApiResponse {
        success: true,
        data: Some(output),
        error: None,
    })
    .into_response()
}

pub async fn get_subscribe(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Path(id): Path<String>,
) -> Response {
    let sub = match ProxySubscribeRepo::find_by_id(&state.db, &id).await {
        Ok(Some(s)) => s,
        Ok(None) => return AppError::NotFound("Subscription not found".into()).into_response(),
        Err(e) => return e.into_response(),
    };

    if !ProxySubscribeRepo::is_authorized(&sub, &auth_user.user_id) {
        return AppError::Forbidden("Not authorized to view this subscription".into())
            .into_response();
    }

    Json(ApiResponse {
        success: true,
        data: Some(ProxySubscribeOutput::from(sub)),
        error: None,
    })
    .into_response()
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateSubscribeInput {
    pub remark: Option<String>,
    pub subscribe_url: Option<String>,
    pub subscribe_items: Option<serde_json::Value>,
    pub rule_list: Option<String>,
    pub use_system_rule_list: Option<bool>,
    pub group: Option<String>,
    pub use_system_group: Option<bool>,
    pub filter: Option<String>,
    pub use_system_filter: Option<bool>,
    pub servers: Option<String>,
    pub custom_config: Option<String>,
    pub use_system_custom_config: Option<bool>,
    pub dns_config: Option<String>,
    pub use_system_dns_config: Option<bool>,
    pub authorized_user_ids: Option<serde_json::Value>,
    pub cache_ttl_minutes: Option<i32>,
}

pub async fn create_subscribe(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Json(body): Json<CreateSubscribeInput>,
) -> Response {
    let sub = match ProxySubscribeRepo::create(
        &state.db,
        &auth_user.user_id,
        body.remark.as_deref(),
        body.subscribe_url.as_deref(),
        body.subscribe_items,
        body.rule_list.as_deref(),
        body.use_system_rule_list,
        body.group.as_deref(),
        body.use_system_group,
        body.filter.as_deref(),
        body.use_system_filter,
        body.servers.as_deref(),
        body.custom_config.as_deref(),
        body.use_system_custom_config,
        body.dns_config.as_deref(),
        body.use_system_dns_config,
        body.authorized_user_ids,
        body.cache_ttl_minutes,
    )
    .await
    {
        Ok(s) => s,
        Err(e) => return e.into_response(),
    };

    Json(ApiResponse {
        success: true,
        data: Some(ProxySubscribeOutput::from(sub)),
        error: None,
    })
    .into_response()
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSubscribeInput {
    pub remark: Option<Option<String>>,
    pub subscribe_url: Option<Option<String>>,
    pub subscribe_items: Option<Option<serde_json::Value>>,
    pub rule_list: Option<Option<String>>,
    pub use_system_rule_list: Option<bool>,
    pub group: Option<Option<String>>,
    pub use_system_group: Option<bool>,
    pub filter: Option<Option<String>>,
    pub use_system_filter: Option<bool>,
    pub servers: Option<Option<String>>,
    pub custom_config: Option<Option<String>>,
    pub use_system_custom_config: Option<bool>,
    pub dns_config: Option<Option<String>>,
    pub use_system_dns_config: Option<bool>,
    pub authorized_user_ids: Option<Option<serde_json::Value>>,
    pub cache_ttl_minutes: Option<Option<i32>>,
}

pub async fn update_subscribe(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Path(id): Path<String>,
    Json(body): Json<UpdateSubscribeInput>,
) -> Response {
    let sub = match ProxySubscribeRepo::find_by_id(&state.db, &id).await {
        Ok(Some(s)) => s,
        Ok(None) => return AppError::NotFound("Subscription not found".into()).into_response(),
        Err(e) => return e.into_response(),
    };

    if !ProxySubscribeRepo::is_owner(&sub, &auth_user.user_id) {
        return AppError::Forbidden("Only the owner can update this subscription".into())
            .into_response();
    }

    let updated = match ProxySubscribeRepo::update(
        &state.db,
        &id,
        body.remark,
        body.subscribe_url,
        body.subscribe_items,
        body.rule_list,
        body.use_system_rule_list,
        body.group,
        body.use_system_group,
        body.filter,
        body.use_system_filter,
        body.servers,
        body.custom_config,
        body.use_system_custom_config,
        body.dns_config,
        body.use_system_dns_config,
        body.authorized_user_ids,
        body.cache_ttl_minutes,
    )
    .await
    {
        Ok(s) => s,
        Err(e) => return e.into_response(),
    };

    Json(ApiResponse {
        success: true,
        data: Some(ProxySubscribeOutput::from(updated)),
        error: None,
    })
    .into_response()
}

pub async fn delete_subscribe(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Path(id): Path<String>,
) -> Response {
    let sub = match ProxySubscribeRepo::find_by_id(&state.db, &id).await {
        Ok(Some(s)) => s,
        Ok(None) => return AppError::NotFound("Subscription not found".into()).into_response(),
        Err(e) => return e.into_response(),
    };

    if !ProxySubscribeRepo::is_owner(&sub, &auth_user.user_id) {
        return AppError::Forbidden("Only the owner can delete this subscription".into())
            .into_response();
    }

    if let Err(e) = ProxySubscribeRepo::delete(&state.db, &id).await {
        return e.into_response();
    }

    Json(ApiResponse {
        success: true,
        data: Some(serde_json::json!({ "id": id })),
        error: None,
    })
    .into_response()
}

pub async fn get_subscribe_stats(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Path(id): Path<String>,
) -> Response {
    let sub = match ProxySubscribeRepo::find_by_id(&state.db, &id).await {
        Ok(Some(s)) => s,
        Ok(None) => return AppError::NotFound("Subscription not found".into()).into_response(),
        Err(e) => return e.into_response(),
    };

    if !ProxySubscribeRepo::is_authorized(&sub, &auth_user.user_id) {
        return AppError::Forbidden("Not authorized".into()).into_response();
    }

    let total = match ProxyAccessLogRepo::count_by_subscribe(&state.db, &id).await {
        Ok(c) => c,
        Err(e) => return e.into_response(),
    };
    let recent = match ProxyAccessLogRepo::recent_by_subscribe(&state.db, &id, 20).await {
        Ok(v) => v,
        Err(e) => return e.into_response(),
    };

    let recent_output: Vec<AccessLogOutput> =
        recent.into_iter().map(AccessLogOutput::from).collect();

    Json(ApiResponse {
        success: true,
        data: Some(serde_json::json!({
            "totalAccesses": total,
            "recentAccesses": recent_output,
        })),
        error: None,
    })
    .into_response()
}

pub async fn get_defaults(
    State(_state): State<Arc<AppState>>,
    _auth_user: AuthUser,
) -> Response {
    Json(ApiResponse {
        success: true,
        data: Some(serde_json::json!({
            "ruleList": "",
            "group": "",
            "filter": "",
            "customConfig": "",
            "dnsConfig": "",
        })),
        error: None,
    })
    .into_response()
}

pub async fn get_user_stats(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
) -> Response {
    let subs = match ProxySubscribeRepo::list_by_user(&state.db, &auth_user.user_id).await {
        Ok(v) => v,
        Err(e) => return e.into_response(),
    };

    let sub_ids: Vec<uuid::Uuid> = subs.iter().map(|s| s.id).collect();
    let total_accesses =
        match ProxyAccessLogRepo::count_by_user_subscribes(&state.db, &sub_ids).await {
            Ok(c) => c,
            Err(e) => return e.into_response(),
        };

    Json(ApiResponse {
        success: true,
        data: Some(serde_json::json!({
            "subscribeCount": subs.len(),
            "totalAccesses": total_accesses,
        })),
        error: None,
    })
    .into_response()
}

// ─── Public stub handlers (no auth) ───

fn extract_client_ip(headers: &HeaderMap) -> Option<String> {
    headers
        .get("x-forwarded-for")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.split(',').next().unwrap_or("").trim().to_string())
        .or_else(|| {
            headers
                .get("x-real-ip")
                .and_then(|v| v.to_str().ok())
                .map(String::from)
        })
}

fn extract_user_agent(headers: &HeaderMap) -> Option<String> {
    headers
        .get("user-agent")
        .and_then(|v| v.to_str().ok())
        .map(String::from)
}

pub async fn public_clash(
    State(state): State<Arc<AppState>>,
    Path(uuid): Path<String>,
    headers: HeaderMap,
) -> Response {
    let sub = match ProxySubscribeRepo::find_by_url(&state.db, &uuid).await {
        Ok(Some(s)) => s,
        Ok(None) => return AppError::NotFound("Subscription not found".into()).into_response(),
        Err(e) => return e.into_response(),
    };

    // Log access
    let _ = ProxyAccessLogRepo::create(
        &state.db,
        sub.id,
        "clash",
        extract_client_ip(&headers).as_deref(),
        extract_user_agent(&headers).as_deref(),
        Some(0),
    )
    .await;
    let _ = ProxySubscribeRepo::touch_access(&state.db, sub.id).await;

    // Stub: return minimal valid Clash config
    let config = "mixed-port: 7890\nallow-lan: false\nmode: rule\nlog-level: info\nproxies: []\nrules:\n  - MATCH,DIRECT\n";
    (
        [(axum::http::header::CONTENT_TYPE, "text/yaml; charset=utf-8")],
        config,
    )
        .into_response()
}

pub async fn public_clash_meta(
    State(state): State<Arc<AppState>>,
    Path(uuid): Path<String>,
    headers: HeaderMap,
) -> Response {
    let sub = match ProxySubscribeRepo::find_by_url(&state.db, &uuid).await {
        Ok(Some(s)) => s,
        Ok(None) => return AppError::NotFound("Subscription not found".into()).into_response(),
        Err(e) => return e.into_response(),
    };

    let _ = ProxyAccessLogRepo::create(
        &state.db,
        sub.id,
        "clash-meta",
        extract_client_ip(&headers).as_deref(),
        extract_user_agent(&headers).as_deref(),
        Some(0),
    )
    .await;
    let _ = ProxySubscribeRepo::touch_access(&state.db, sub.id).await;

    let config = "mixed-port: 7890\nallow-lan: false\nmode: rule\nlog-level: info\nfind-process-mode: strict\nunified-delay: true\nproxies: []\nrules:\n  - MATCH,DIRECT\n";
    (
        [(axum::http::header::CONTENT_TYPE, "text/yaml; charset=utf-8")],
        config,
    )
        .into_response()
}

pub async fn public_sing_box(
    State(state): State<Arc<AppState>>,
    Path(uuid): Path<String>,
    headers: HeaderMap,
) -> Response {
    let sub = match ProxySubscribeRepo::find_by_url(&state.db, &uuid).await {
        Ok(Some(s)) => s,
        Ok(None) => return AppError::NotFound("Subscription not found".into()).into_response(),
        Err(e) => return e.into_response(),
    };

    let _ = ProxyAccessLogRepo::create(
        &state.db,
        sub.id,
        "sing-box",
        extract_client_ip(&headers).as_deref(),
        extract_user_agent(&headers).as_deref(),
        Some(0),
    )
    .await;
    let _ = ProxySubscribeRepo::touch_access(&state.db, sub.id).await;

    let config = serde_json::json!({
        "log": { "level": "info" },
        "inbounds": [],
        "outbounds": [
            { "type": "direct", "tag": "direct" }
        ],
        "route": {
            "rules": [],
            "final": "direct"
        }
    });

    Json(config).into_response()
}
