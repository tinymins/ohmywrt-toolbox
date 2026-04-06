pub mod cache;
pub mod converter;
pub mod debug;
pub mod engine;
pub mod fetch_subscription;
pub mod icons;
pub mod parser;
pub mod types;

use std::collections::HashMap;
use std::sync::Arc;

use axum::extract::{Path, Query, State};
use axum::http::HeaderMap;
use axum::response::{IntoResponse, Response};
use axum::Json;
use sea_orm::*;
use serde::{Deserialize, Serialize};

use crate::db::entities::{proxy_access_logs, proxy_subscribes, users};
use crate::db::repos::proxy_access_log_repo::ProxyAccessLogRepo;
use crate::db::repos::proxy_subscribe_repo::ProxySubscribeRepo;
use crate::error::{ApiResponse, AppError};
use crate::handlers::auth::AuthUser;
use crate::AppState;

// ─── Output types ───

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct UserBrief {
    pub id: String,
    pub name: String,
    pub email: String,
}

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
    pub authorized_user_ids: Vec<String>,
    pub cache_ttl_minutes: Option<i32>,
    pub cached_node_count: i32,
    pub total_access_count: i64,
    pub last_access_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub user: UserBrief,
    pub authorized_users: Vec<UserBrief>,
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

// ─── Helpers ───

/// Extract authorized_user_ids from JSONB value as Vec<String>
fn extract_authorized_ids(value: &Option<serde_json::Value>) -> Vec<String> {
    value
        .as_ref()
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(String::from))
                .collect()
        })
        .unwrap_or_default()
}

/// Batch-fetch users by their UUIDs, return HashMap<uuid_string, UserBrief>
async fn batch_fetch_users(
    db: &DatabaseConnection,
    user_ids: &[String],
) -> Result<HashMap<String, UserBrief>, AppError> {
    if user_ids.is_empty() {
        return Ok(HashMap::new());
    }

    let uuids: Vec<uuid::Uuid> = user_ids
        .iter()
        .filter_map(|id| uuid::Uuid::parse_str(id).ok())
        .collect();

    if uuids.is_empty() {
        return Ok(HashMap::new());
    }

    let found_users = users::Entity::find()
        .filter(users::Column::Id.is_in(uuids))
        .all(db)
        .await?;

    let map: HashMap<String, UserBrief> = found_users
        .into_iter()
        .map(|u| {
            (
                u.id.to_string(),
                UserBrief {
                    id: u.id.to_string(),
                    name: u.name,
                    email: u.email,
                },
            )
        })
        .collect();

    Ok(map)
}

/// Enrich a single subscription with user data and access count
async fn enrich_subscribe(
    _db: &DatabaseConnection,
    sub: proxy_subscribes::Model,
    user_map: &HashMap<String, UserBrief>,
    access_counts: &HashMap<String, u64>,
) -> ProxySubscribeOutput {
    let sub_id_str = sub.id.to_string();
    let user_id_str = sub.user_id.to_string();
    let auth_ids = extract_authorized_ids(&sub.authorized_user_ids);

    let user = user_map
        .get(&user_id_str)
        .cloned()
        .unwrap_or_else(|| UserBrief {
            id: user_id_str.clone(),
            name: "Unknown".into(),
            email: "".into(),
        });

    let authorized_users: Vec<UserBrief> = auth_ids
        .iter()
        .filter_map(|id| user_map.get(id).cloned())
        .collect();

    let total_access_count = access_counts.get(&sub_id_str).copied().unwrap_or(0) as i64;

    ProxySubscribeOutput {
        id: sub_id_str,
        user_id: user_id_str,
        url: sub.url,
        remark: sub.remark,
        subscribe_url: sub.subscribe_url,
        subscribe_items: sub.subscribe_items,
        rule_list: sub.rule_list,
        use_system_rule_list: sub.use_system_rule_list,
        group: sub.group,
        use_system_group: sub.use_system_group,
        filter: sub.filter,
        use_system_filter: sub.use_system_filter,
        servers: sub.servers,
        custom_config: sub.custom_config,
        use_system_custom_config: sub.use_system_custom_config,
        dns_config: sub.dns_config,
        use_system_dns_config: sub.use_system_dns_config,
        authorized_user_ids: auth_ids,
        cache_ttl_minutes: sub.cache_ttl_minutes,
        cached_node_count: sub.cached_node_count.unwrap_or(0),
        total_access_count,
        last_access_at: sub.last_access_at.map(|dt| dt.to_rfc3339()),
        created_at: sub
            .created_at
            .map(|dt| dt.to_rfc3339())
            .unwrap_or_default(),
        updated_at: sub
            .updated_at
            .map(|dt| dt.to_rfc3339())
            .unwrap_or_default(),
        user,
        authorized_users,
    }
}

/// Batch-count access logs for multiple subscribe IDs
async fn batch_count_access(
    db: &DatabaseConnection,
    subscribe_ids: &[uuid::Uuid],
) -> Result<HashMap<String, u64>, AppError> {
    if subscribe_ids.is_empty() {
        return Ok(HashMap::new());
    }

    use sea_orm::FromQueryResult;

    #[derive(Debug, FromQueryResult)]
    struct SubCount {
        subscribe_id: uuid::Uuid,
        count: i64,
    }

    let results = proxy_access_logs::Entity::find()
        .filter(proxy_access_logs::Column::SubscribeId.is_in(subscribe_ids.to_vec()))
        .select_only()
        .column(proxy_access_logs::Column::SubscribeId)
        .column_as(proxy_access_logs::Column::Id.count(), "count")
        .group_by(proxy_access_logs::Column::SubscribeId)
        .into_model::<SubCount>()
        .all(db)
        .await?;

    let map: HashMap<String, u64> = results
        .into_iter()
        .map(|r| (r.subscribe_id.to_string(), r.count as u64))
        .collect();

    Ok(map)
}

/// Enrich a list of subscriptions efficiently using batch queries
async fn enrich_subscribes_batch(
    db: &DatabaseConnection,
    subs: Vec<proxy_subscribes::Model>,
) -> Result<Vec<ProxySubscribeOutput>, AppError> {
    // Collect all user IDs needed
    let mut all_user_ids: Vec<String> = Vec::new();
    for sub in &subs {
        all_user_ids.push(sub.user_id.to_string());
        let auth_ids = extract_authorized_ids(&sub.authorized_user_ids);
        all_user_ids.extend(auth_ids);
    }
    all_user_ids.sort();
    all_user_ids.dedup();

    // Batch fetch users and access counts
    let user_map = batch_fetch_users(db, &all_user_ids).await?;
    let sub_ids: Vec<uuid::Uuid> = subs.iter().map(|s| s.id).collect();
    let access_counts = batch_count_access(db, &sub_ids).await?;

    let mut output = Vec::with_capacity(subs.len());
    for sub in subs {
        output.push(enrich_subscribe(db, sub, &user_map, &access_counts).await);
    }
    Ok(output)
}

/// Enrich a single subscription (convenience wrapper)
async fn enrich_single(
    db: &DatabaseConnection,
    sub: proxy_subscribes::Model,
) -> Result<ProxySubscribeOutput, AppError> {
    let mut result = enrich_subscribes_batch(db, vec![sub]).await?;
    Ok(result.remove(0))
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

    let output = match enrich_subscribes_batch(&state.db, subs).await {
        Ok(v) => v,
        Err(e) => return e.into_response(),
    };

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

    let output = match enrich_single(&state.db, sub).await {
        Ok(v) => v,
        Err(e) => return e.into_response(),
    };

    Json(ApiResponse {
        success: true,
        data: Some(output),
        error: None,
    })
    .into_response()
}

#[derive(Deserialize)]
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

    let output = match enrich_single(&state.db, sub).await {
        Ok(v) => v,
        Err(e) => return e.into_response(),
    };

    Json(ApiResponse {
        success: true,
        data: Some(output),
        error: None,
    })
    .into_response()
}

#[derive(Deserialize)]
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

    let is_owner = ProxySubscribeRepo::is_owner(&sub, &auth_user.user_id);
    let is_authorized = ProxySubscribeRepo::is_authorized(&sub, &auth_user.user_id);

    if !is_owner && !is_authorized {
        return AppError::Forbidden("Not authorized to update this subscription".into())
            .into_response();
    }

    // Authorized (non-owner) users can update config but NOT authorizedUserIds
    let auth_ids = if is_owner {
        body.authorized_user_ids
    } else {
        None // Non-owners cannot change authorization list
    };

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
        auth_ids,
        body.cache_ttl_minutes,
    )
    .await
    {
        Ok(s) => s,
        Err(e) => return e.into_response(),
    };

    let output = match enrich_single(&state.db, updated).await {
        Ok(v) => v,
        Err(e) => return e.into_response(),
    };

    Json(ApiResponse {
        success: true,
        data: Some(output),
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

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StatsQuery {
    pub page: Option<u64>,
    pub page_size: Option<u64>,
}

pub async fn get_subscribe_stats(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Path(id): Path<String>,
    Query(query): Query<StatsQuery>,
) -> Response {
    let sub = match ProxySubscribeRepo::find_by_id(&state.db, &id).await {
        Ok(Some(s)) => s,
        Ok(None) => return AppError::NotFound("Subscription not found".into()).into_response(),
        Err(e) => return e.into_response(),
    };

    if !ProxySubscribeRepo::is_authorized(&sub, &auth_user.user_id) {
        return AppError::Forbidden("Not authorized".into()).into_response();
    }

    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(20);

    let total_access =
        match ProxyAccessLogRepo::count_by_subscribe(&state.db, &id).await {
            Ok(c) => c,
            Err(e) => return e.into_response(),
        };

    let today_access =
        match ProxyAccessLogRepo::count_today_by_subscribe(&state.db, sub.id).await {
            Ok(c) => c,
            Err(e) => return e.into_response(),
        };

    let access_by_type =
        match ProxyAccessLogRepo::count_by_access_type(&state.db, sub.id).await {
            Ok(v) => v,
            Err(e) => return e.into_response(),
        };

    let recent =
        match ProxyAccessLogRepo::recent_by_subscribe_paginated(&state.db, sub.id, page, page_size)
            .await
        {
            Ok(v) => v,
            Err(e) => return e.into_response(),
        };

    let recent_output: Vec<AccessLogOutput> =
        recent.into_iter().map(AccessLogOutput::from).collect();

    let access_by_type_output: Vec<serde_json::Value> = access_by_type
        .into_iter()
        .map(|(t, c)| serde_json::json!({ "type": t, "count": c }))
        .collect();

    Json(ApiResponse {
        success: true,
        data: Some(serde_json::json!({
            "totalAccesses": total_access,
            "todayAccess": today_access,
            "cachedNodeCount": sub.cached_node_count.unwrap_or(0),
            "lastAccessAt": sub.last_access_at.map(|dt| dt.to_rfc3339()),
            "accessByType": access_by_type_output,
            "recentAccessTotal": total_access,
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
            "ruleList": DEFAULT_RULE_PROVIDERS_JSON,
            "group": DEFAULT_GROUPS_JSON,
            "filter": DEFAULT_FILTER_JSON,
            "customConfig": DEFAULT_CUSTOM_CONFIG_JSON,
            "dnsConfig": DEFAULT_DNS_CONFIG_JSON,
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
    let total_nodes: i64 = subs
        .iter()
        .map(|s| s.cached_node_count.unwrap_or(0) as i64)
        .sum();

    let today_requests =
        match ProxyAccessLogRepo::count_today_by_user_subscribes(&state.db, &sub_ids).await {
            Ok(c) => c,
            Err(e) => return e.into_response(),
        };

    Json(ApiResponse {
        success: true,
        data: Some(serde_json::json!({
            "totalSubscriptions": subs.len(),
            "totalNodes": total_nodes,
            "todayRequests": today_requests,
        })),
        error: None,
    })
    .into_response()
}

// ─── Preview / Debug placeholder handlers ───

pub async fn preview_nodes(
    State(state): State<Arc<AppState>>,
    _auth_user: AuthUser,
    Path(id): Path<String>,
) -> Response {
    let sub = match ProxySubscribeRepo::find_by_id(&state.db, &id).await {
        Ok(Some(s)) => s,
        Ok(None) => return AppError::NotFound("Subscription not found".into()).into_response(),
        Err(e) => return e.into_response(),
    };

    let nodes = match engine::fetch_proxies_preview(&sub).await {
        Ok(n) => n,
        Err(e) => {
            return Json(ApiResponse {
                success: false,
                data: None::<serde_json::Value>,
                error: Some(e),
            })
            .into_response()
        }
    };

    Json(ApiResponse {
        success: true,
        data: Some(serde_json::json!({ "nodes": nodes })),
        error: None,
    })
    .into_response()
}

pub async fn trace_node(
    State(state): State<Arc<AppState>>,
    _auth_user: AuthUser,
    Path(id): Path<String>,
    Query(params): Query<TraceNodeParams>,
) -> Response {
    let sub = match ProxySubscribeRepo::find_by_id(&state.db, &id).await {
        Ok(Some(s)) => s,
        Ok(None) => return AppError::NotFound("Subscription not found".into()).into_response(),
        Err(e) => return e.into_response(),
    };

    let result = debug::trace_node_logic(&sub, &params.format, &params.node_name).await;

    Json(ApiResponse {
        success: true,
        data: Some(result),
        error: None,
    })
    .into_response()
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TraceNodeParams {
    format: String,
    node_name: String,
}

pub async fn debug_proxy(
    State(state): State<Arc<AppState>>,
    _auth_user: AuthUser,
    Json(body): Json<DebugProxyInput>,
) -> Response {
    let sub = match ProxySubscribeRepo::find_by_id(&state.db, &body.id).await {
        Ok(Some(s)) => s,
        Ok(None) => return AppError::NotFound("Subscription not found".into()).into_response(),
        Err(e) => return e.into_response(),
    };

    debug::debug_proxy_stream(sub, body.format).into_response()
}

#[derive(Deserialize)]
pub struct DebugProxyInput {
    id: String,
    format: String,
}

// ─── Public handlers (no auth) ───

pub async fn clear_cache(_auth_user: AuthUser) -> Response {
    cache::clear_all();
    Json(ApiResponse {
        success: true,
        data: Some(serde_json::json!({ "cleared": true })),
        error: None,
    })
    .into_response()
}

/// Test a single subscription source URL with a given UA (bypasses cache).
pub async fn test_source(
    _auth_user: AuthUser,
    Json(body): Json<TestSourceInput>,
) -> Response {
    let ua = engine::resolve_ua(Some(&body.ua));
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .unwrap_or_default();

    let start = std::time::Instant::now();
    let resp = match client
        .get(&body.url)
        .header("User-Agent", &ua)
        .send()
        .await
    {
        Ok(r) => r,
        Err(e) => {
            return Json(ApiResponse {
                success: false,
                data: None::<serde_json::Value>,
                error: Some(format!("Request failed: {e}")),
            })
            .into_response();
        }
    };

    let status = resp.status().as_u16();
    let text = match resp.text().await {
        Ok(t) => t,
        Err(e) => {
            return Json(ApiResponse {
                success: false,
                data: None::<serde_json::Value>,
                error: Some(format!("Failed to read response: {e}")),
            })
            .into_response();
        }
    };

    let proxies = parser::parse_subscription(&text);
    let elapsed = start.elapsed().as_millis() as u64;

    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    struct NodeBrief {
        name: String,
        proxy_type: String,
    }

    let nodes: Vec<NodeBrief> = proxies
        .iter()
        .map(|p| NodeBrief {
            name: p.name.clone(),
            proxy_type: p.proxy_type.clone(),
        })
        .collect();

    Json(ApiResponse {
        success: true,
        data: Some(serde_json::json!({
            "status": status,
            "ua": ua,
            "nodeCount": nodes.len(),
            "nodes": nodes,
            "elapsedMs": elapsed,
            "bodyBytes": text.len(),
        })),
        error: None,
    })
    .into_response()
}

#[derive(Deserialize)]
pub struct TestSourceInput {
    url: String,
    ua: String,
}

// ─── Public proxy handlers (no auth) ───

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

    let proxies = match engine::fetch_proxies(&sub, "clash").await {
        Ok(p) => p,
        Err(e) => {
            tracing::warn!("fetch_proxies failed: {}", e);
            Vec::new()
        }
    };

    let config = engine::build_clash_config(&sub, &proxies, false);

    let _ = ProxyAccessLogRepo::create(
        &state.db,
        sub.id,
        "clash",
        extract_client_ip(&headers).as_deref(),
        extract_user_agent(&headers).as_deref(),
        Some(proxies.len() as i32),
    )
    .await;
    let _ = ProxySubscribeRepo::touch_access(&state.db, sub.id).await;

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

    let proxies = match engine::fetch_proxies(&sub, "clash-meta").await {
        Ok(p) => p,
        Err(e) => {
            tracing::warn!("fetch_proxies failed: {}", e);
            Vec::new()
        }
    };

    let config = engine::build_clash_config(&sub, &proxies, true);

    let _ = ProxyAccessLogRepo::create(
        &state.db,
        sub.id,
        "clash-meta",
        extract_client_ip(&headers).as_deref(),
        extract_user_agent(&headers).as_deref(),
        Some(proxies.len() as i32),
    )
    .await;
    let _ = ProxySubscribeRepo::touch_access(&state.db, sub.id).await;

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
    handle_singbox(state, uuid, headers, false).await
}

pub async fn public_sing_box_v12(
    State(state): State<Arc<AppState>>,
    Path(uuid): Path<String>,
    headers: HeaderMap,
) -> Response {
    handle_singbox(state, uuid, headers, true).await
}

async fn handle_singbox(
    state: Arc<AppState>,
    uuid: String,
    headers: HeaderMap,
    is_v12: bool,
) -> Response {
    let sub = match ProxySubscribeRepo::find_by_url(&state.db, &uuid).await {
        Ok(Some(s)) => s,
        Ok(None) => return AppError::NotFound("Subscription not found".into()).into_response(),
        Err(e) => return e.into_response(),
    };

    let format = if is_v12 { "sing-box-v12" } else { "sing-box" };
    let proxies = match engine::fetch_proxies(&sub, format).await {
        Ok(p) => p,
        Err(e) => {
            tracing::warn!("fetch_proxies failed: {}", e);
            Vec::new()
        }
    };

    // Derive public server URL from headers
    let public_server_url = get_public_server_url(&headers);

    let config = engine::build_singbox_config(&sub, &proxies, is_v12, &public_server_url);

    let access_type = if is_v12 { "sing-box-v12" } else { "sing-box" };
    let _ = ProxyAccessLogRepo::create(
        &state.db,
        sub.id,
        access_type,
        extract_client_ip(&headers).as_deref(),
        extract_user_agent(&headers).as_deref(),
        Some(proxies.len() as i32),
    )
    .await;
    let _ = ProxySubscribeRepo::touch_access(&state.db, sub.id).await;

    (
        [(
            axum::http::header::CONTENT_TYPE,
            "application/json; charset=utf-8",
        )],
        serde_json::to_string_pretty(&config).unwrap_or_default(),
    )
        .into_response()
}

fn get_public_server_url(headers: &HeaderMap) -> String {
    if let Ok(url) = std::env::var("PUBLIC_SERVER_URL") {
        if !url.is_empty() {
            return url;
        }
    }
    let proto = headers
        .get("x-forwarded-proto")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("http");
    let host = headers
        .get("host")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("localhost:4000");
    format!("{}://{}", proto, host)
}

// ─── Default config constants (ported from old lib-config.ts) ───

pub(super) const DEFAULT_RULE_PROVIDERS_JSON: &str = r#"{
  "🍎 苹果APNs": [{"name":"AppleApns","url":"https://raw.githubusercontent.com/ohmywrt/clash-rule/refs/heads/master/AppleAPNs.yaml"}],
  "🍎 苹果服务": [{"name":"Apple","url":"https://raw.githubusercontent.com/dler-io/Rules/refs/heads/main/Clash/Provider/Apple.yaml"},{"name":"AppleTV","url":"https://raw.githubusercontent.com/dler-io/Rules/refs/heads/main/Clash/Provider/Media/Apple%20TV.yaml"},{"name":"AppleMusic","url":"https://raw.githubusercontent.com/dler-io/Rules/refs/heads/main/Clash/Provider/Media/Apple%20Music.yaml"}],
  "🪟 Microsoft": [{"name":"Microsoft","url":"https://raw.githubusercontent.com/dler-io/Rules/refs/heads/main/Clash/Provider/Microsoft.yaml"}],
  "👽 Reddit": [{"name":"Reddit","url":"https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/refs/heads/master/rule/Clash/Reddit/Reddit_No_Resolve.yaml"}],
  "🤖 ChatGPT-IOS": [{"name":"ChatGPT-IOS","url":"https://raw.githubusercontent.com/ohmywrt/clash-rule/refs/heads/master/chatgpt-ios.yaml"}],
  "🤖 AI": [{"name":"AI","url":"https://raw.githubusercontent.com/dler-io/Rules/refs/heads/main/Clash/Provider/AI%20Suite.yaml"}],
  "🐙 GitHub": [{"name":"GitHub","url":"https://raw.githubusercontent.com/ohmywrt/clash-rule/refs/heads/master/github.yaml"}],
  "🪙 Crypto": [{"name":"Crypto","url":"https://raw.githubusercontent.com/dler-io/Rules/refs/heads/main/Clash/Provider/Crypto.yaml"}],
  "🎬 Youtube": [{"name":"Youtube","url":"https://raw.githubusercontent.com/dler-io/Rules/refs/heads/main/Clash/Provider/Media/YouTube.yaml"}],
  "🎬 TikTok": [{"name":"TikTok","url":"https://raw.githubusercontent.com/Z-Siqi/Clash-for-Windows_Rule/refs/heads/main/Rule/TikTok"}],
  "🎬 Netflix": [{"name":"Netflix","url":"https://raw.githubusercontent.com/dler-io/Rules/refs/heads/main/Clash/Provider/Media/Netflix.yaml"}],
  "🎬 PTTracker": [{"name":"PTTracker","url":"https://raw.githubusercontent.com/ohmywrt/clash-rule/refs/heads/master/PTTracker.yaml"}],
  "🎮 Steam": [{"name":"Steam","url":"https://raw.githubusercontent.com/dler-io/Rules/refs/heads/main/Clash/Provider/Steam.yaml"}],
  "🎮 SteamContent": [{"name":"SteamContent","url":"https://raw.githubusercontent.com/ohmywrt/clash-rule/refs/heads/master/SteamContent.yaml"}],
  "🎮 SeasunGame": [{"name":"SeasunGame","url":"https://raw.githubusercontent.com/ohmywrt/clash-rule/refs/heads/master/SeasunGame.yaml"}],
  "🎮 Discord": [{"name":"Discord","url":"https://raw.githubusercontent.com/dler-io/Rules/refs/heads/main/Clash/Provider/Discord.yaml"}],
  "✈️ Telegram": [{"name":"Telegram","url":"https://raw.githubusercontent.com/dler-io/Rules/refs/heads/main/Clash/Provider/Telegram.yaml"}],
  "🏳️‍🌈 Google": [{"name":"GoogleCIDRv2","url":"https://vercel.williamchan.me/api/google-ips"}],
  "🛡️ 正版验证拦截": [{"name":"AdobeUnlicensed","url":"https://raw.githubusercontent.com/ohmywrt/clash-rule/refs/heads/master/AdobeUnlicensed.yaml"}],
  "🧹 秋风广告规则 AWAvenue": [{"name":"AWAvenueAD","url":"https://raw.githubusercontent.com/TG-Twilight/AWAvenue-Ads-Rule/main/Filters/AWAvenue-Ads-Rule-Clash.yaml"}],
  "💊 广告合集": [{"name":"AD","url":"https://raw.githubusercontent.com/dler-io/Rules/refs/heads/main/Clash/Provider/AdBlock.yaml"}]
}"#;

pub(super) const DEFAULT_GROUPS_JSON: &str = r#"[
  {"name":"🔰 国外流量","type":"select","proxies":["🚀 直接连接"]},
  {"name":"🏳️‍🌈 Google","type":"select","proxies":["🔰 国外流量","🚀 直接连接"]},
  {"name":"✈️ Telegram","type":"select","proxies":["🔰 国外流量","🚀 直接连接"]},
  {"name":"🎬 Youtube","type":"select","proxies":["🔰 国外流量","🚀 直接连接"]},
  {"name":"🎬 TikTok","type":"select","proxies":["🚀 直接连接","🔰 国外流量"]},
  {"name":"🎬 Netflix","type":"select","proxies":["🔰 国外流量","🚀 直接连接"]},
  {"name":"🎬 PTTracker","type":"select","proxies":["🚀 直接连接","🔰 国外流量"]},
  {"name":"👽 Reddit","type":"select","proxies":["🔰 国外流量","🚀 直接连接"]},
  {"name":"🍎 苹果APNs","type":"select","proxies":["🚀 直接连接","🔰 国外流量"]},
  {"name":"🍎 苹果服务","type":"select","proxies":["🚀 直接连接","🔰 国外流量"]},
  {"name":"🪟 Microsoft","type":"select","proxies":["🚀 直接连接","🔰 国外流量"]},
  {"name":"🎮 Steam","type":"select","proxies":["🔰 国外流量","🚀 直接连接"]},
  {"name":"🎮 SteamContent","type":"select","proxies":["🚀 直接连接","🔰 国外流量"]},
  {"name":"🎮 SeasunGame","type":"select","proxies":["🚀 直接连接","🔰 国外流量"]},
  {"name":"🎮 Discord","type":"select","proxies":["🔰 国外流量","🚀 直接连接"]},
  {"name":"🤖 ChatGPT-IOS","type":"select","proxies":["🔰 国外流量","🚀 直接连接"]},
  {"name":"🤖 AI","type":"select","proxies":["🔰 国外流量","🚀 直接连接"]},
  {"name":"🐙 GitHub","type":"select","proxies":["🔰 国外流量","🚀 直接连接"]},
  {"name":"🪙 Crypto","type":"select","proxies":["🔰 国外流量","🚀 直接连接"]},
  {"name":"🛡️ 正版验证拦截","type":"select","proxies":["REJECT","🚀 直接连接","🔰 国外流量"]},
  {"name":"🧹 秋风广告规则 AWAvenue","type":"select","proxies":["🚀 直接连接","🔰 国外流量","REJECT"]},
  {"name":"🚀 直接连接","type":"select","proxies":["DIRECT"],"readonly":true},
  {"name":"💊 广告合集","type":"select","proxies":["DIRECT","REJECT"],"readonly":true},
  {"name":"⚓️ 其他流量","type":"select","proxies":["🔰 国外流量","🚀 直接连接"],"readonly":true}
]"#;

pub(super) const DEFAULT_FILTER_JSON: &str = r#"["官网","客服","qq群"]"#;

pub(super) const DEFAULT_CUSTOM_CONFIG_JSON: &str = "[]";

pub(super) const DEFAULT_DNS_CONFIG_JSON: &str = r#"{
  "shared": {
    "localDns": "127.0.0.1",
    "localDnsPort": 53,
    "fakeipIpv4Range": "198.18.0.0/15",
    "fakeipIpv6Range": "fc00::/18",
    "fakeipEnabled": true,
    "fakeipTtl": 300,
    "dnsListenPort": 1053,
    "tproxyPort": 7893,
    "rejectHttps": true,
    "cnDomainLocalDns": true,
    "clashApiPort": 9999,
    "clashApiSecret": "123456",
    "clashApiUiPath": "/etc/sb/ui"
  }
}"#;
