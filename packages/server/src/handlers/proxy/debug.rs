use std::convert::Infallible;
use std::time::{Duration, Instant};

use axum::response::sse::{Event, KeepAlive, Sse};
use axum::response::{IntoResponse, Response};
use serde_json::{json, Map, Value};
use tokio::sync::mpsc;
use tokio_stream::wrappers::ReceiverStream;

use crate::db::entities::proxy_subscribes;

use super::cache;
use super::converter::{convert_clash_proxy_to_singbox, convert_clash_proxy_to_singbox_with_diff};
use super::parser;
use super::engine::{
    self, parse_jsonc, resolve_dns_config, safe_parse_jsonc,
};
use super::icons::append_icon;
use super::origins::build_field_origins;
use super::parser::{is_base64_subscription, parse_subscription};
use super::types::ClashProxy;
use super::validator;
use super::{
    DEFAULT_CUSTOM_CONFIG_JSON, DEFAULT_FILTER_JSON, DEFAULT_GROUPS_JSON,
    DEFAULT_RULE_PROVIDERS_JSON,
};

// ─── Shared helpers ───

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct SubItem {
    url: String,
    #[serde(default)]
    prefix: String,
    #[serde(default)]
    enabled: Option<bool>,
    #[serde(default)]
    cache_ttl_minutes: Option<i32>,
    #[serde(default)]
    fetch_ua: Option<String>,
}

fn parse_subscribe_items(sub: &proxy_subscribes::Model) -> Vec<SubItem> {
    if let Some(ref si) = sub.subscribe_items {
        serde_json::from_value(si.clone()).unwrap_or_default()
    } else if let Some(ref url) = sub.subscribe_url {
        engine::parse_subscribe_url(url).into_iter().map(|u| SubItem {
            url: u, prefix: String::new(), enabled: Some(true), cache_ttl_minutes: None, fetch_ua: None,
        }).collect()
    } else {
        Vec::new()
    }
}

fn get_filters(sub: &proxy_subscribes::Model) -> Vec<String> {
    let default_filter: Vec<String> = parse_jsonc(DEFAULT_FILTER_JSON, Vec::new());
    if sub.use_system_filter {
        default_filter
    } else {
        safe_parse_jsonc(sub.filter.as_deref(), Vec::new())
    }
}

fn get_groups(sub: &proxy_subscribes::Model) -> Vec<Value> {
    let default_groups: Vec<Value> = parse_jsonc(DEFAULT_GROUPS_JSON, Vec::new());
    if sub.use_system_group {
        default_groups.clone()
    } else {
        let custom: Vec<Value> = safe_parse_jsonc(sub.group.as_deref(), Vec::new());
        if custom.is_empty() {
            default_groups
        } else {
            custom
        }
    }
}

fn detect_format(text: &str) -> &'static str {
    if is_base64_subscription(text) {
        "base64"
    } else {
        let trimmed = text.trim();
        if trimmed.starts_with("proxies:")
            || trimmed.contains("\nproxies:")
            || trimmed.starts_with("port:")
        {
            "yaml"
        } else {
            "unknown"
        }
    }
}

/// 规范化前缀：如果非空且结尾不是分隔符或闭合括号，自动追加"丨"
fn normalize_prefix(raw: &str) -> String {
    if raw.is_empty() {
        return String::new();
    }
    
    let separators = ["-", " ", "丨", "|", "｜", "/", "_", "·"];
    let closing_brackets = [")", "）", "]", "】", "}", "》", ">", "」"];
    
    // 检查是否已以分隔符或闭合括号结尾
    if separators.iter().any(|&s| raw.ends_with(s)) {
        return raw.to_string();
    }
    if closing_brackets.iter().any(|&s| raw.ends_with(s)) {
        return raw.to_string();
    }
    
    // 否则在结尾添加"丨"
    format!("{raw}丨")
}

fn make_preview_node(p: &ClashProxy, source_index: usize, source_url: &str) -> Value {
    json!({
        "name": p.name,
        "type": p.proxy_type,
        "server": p.server,
        "port": p.port,
        "sourceIndex": source_index,
        "sourceUrl": source_url,
        "raw": serde_json::to_value(p).unwrap_or_default(),
    })
}

fn build_http_client() -> reqwest::Client {
    reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .unwrap_or_default()
}

// ─── trace_node logic ───

pub async fn trace_node_logic(
    sub: &proxy_subscribes::Model,
    format: &str,
    node_name: &str,
) -> Value {
    let filter = get_filters(sub);
    let groups = get_groups(sub);

    // Use the real engine to get all nodes with source metadata
    let Ok(preview_nodes) = engine::fetch_proxies_preview(sub).await else {
        return json!({ "nodeName": node_name, "steps": [] });
    };

    // Find the target node
    let Some(target) = preview_nodes.iter().find(|n| n.name == node_name) else {
        return json!({ "nodeName": node_name, "steps": [] });
    };

    let mut steps: Vec<Value> = Vec::new();

    // Step 1: source
    let source_format = if target.source_url == "manual" {
        "manual"
    } else {
        // Detect format by checking if the original data looks like base64
        // Since we don't have the raw text here, infer from source_url
        "yaml"
    };

    let mut source_data = json!({
        "sourceIndex": target.source_index,
        "sourceUrl": target.source_url,
        "format": source_format,
        "rawData": target.raw,
    });

    // For manual servers with raw URL string, add rawUrl
    if target.source_url == "manual" {
        let servers: Vec<Value> = safe_parse_jsonc(sub.servers.as_deref(), Vec::new());
        for item in &servers {
            if let Value::String(s) = item
                && let Ok(p) = serde_yaml::from_str::<ClashProxy>(s)
                    && append_icon(&p.name) == node_name {
                        source_data["rawUrl"] = json!(s);
                        break;
                    }
        }
    }

    steps.push(json!({ "type": "source", "data": source_data }));

    // Step 2: parse
    steps.push(json!({
        "type": "parse",
        "data": { "clashProxy": target.raw }
    }));

    // Step 3: filter
    let passed = !target.filtered;
    steps.push(json!({
        "type": "filter",
        "data": {
            "passed": passed,
            "matchedRule": target.filtered_by,
            "filtersApplied": filter,
        }
    }));

    // Step 4: enrich - reconstruct original name by removing icon
    // The original name before append_icon is the raw proxy name
    let original_name = target
        .raw
        .get("name")
        .and_then(|v| v.as_str())
        .unwrap_or(&target.name);
    steps.push(json!({
        "type": "enrich",
        "data": {
            "originalName": original_name,
            "enrichedName": target.name,
        }
    }));

    // If filtered, stop here
    if !passed {
        return json!({ "nodeName": node_name, "steps": steps });
    }

    // Step 5: merge - get position in final list
    let final_proxies = engine::fetch_proxies(sub, format).await.unwrap_or_default();

    let position = final_proxies
        .iter()
        .position(|p| p.name == node_name)
        .map_or(0, |i| i + 1);
    steps.push(json!({
        "type": "merge",
        "data": {
            "positionInFinalList": position,
            "totalNodes": final_proxies.len(),
        }
    }));

    // Step 6: group-assign
    let assigned_groups: Vec<Value> = groups
        .iter()
        .filter(|g| {
            let readonly = g
                .get("readonly")
                .and_then(sea_orm::JsonValue::as_bool)
                .unwrap_or(false);
            !readonly
        })
        .map(|g| {
            json!({
                "name": g.get("name").and_then(|v| v.as_str()).unwrap_or(""),
                "type": g.get("type").and_then(|v| v.as_str()).unwrap_or("select"),
            })
        })
        .collect();
    steps.push(json!({
        "type": "group-assign",
        "data": { "assignedGroups": assigned_groups }
    }));

    // Step 7: convert (sing-box only) — with entropy-loss detection
    if (format == "sing-box" || format == "sing-box-v12")
        && let Some(proxy) = final_proxies.iter().find(|p| p.name == node_name) {
            let (outbound, lost_fields, ignored_fields) = convert_clash_proxy_to_singbox_with_diff(proxy);
            if let Some(ref ob) = outbound {
                let field_origins = build_field_origins(proxy, ob);
                steps.push(json!({
                    "type": "convert",
                    "data": {
                        "singboxOutbound": ob,
                        "lostFields": lost_fields,
                        "ignoredFields": ignored_fields,
                        "fieldOrigins": field_origins,
                    }
                }));
            }
        }

    // Step 8: output - config fragment for this node
    let config_fragment = if let Some(proxy) = final_proxies.iter().find(|p| p.name == node_name) {
        match format {
            "clash" | "clash-meta" => {
                serde_yaml::to_string(&serde_json::to_value(proxy).unwrap_or_default())
                    .unwrap_or_default()
            }
            "sing-box" | "sing-box-v12" => {
                convert_clash_proxy_to_singbox(proxy)
                    .map(|ob| serde_json::to_string_pretty(&ob).unwrap_or_default())
                    .unwrap_or_default()
            }
            _ => String::new(),
        }
    } else {
        String::new()
    };
    steps.push(json!({
        "type": "output",
        "data": { "configFragment": config_fragment }
    }));

    json!({
        "nodeName": node_name,
        "steps": steps,
    })
}

// Note: The original name stored in PreviewNode.raw already has the pre-icon name.
// PreviewNode.name has the post-icon name (what the frontend sees).

// ─── debug_proxy SSE logic ───

pub fn debug_proxy_stream(
    sub: proxy_subscribes::Model,
    format: String,
) -> Response {
    let (tx, rx) = mpsc::channel::<Result<Event, Infallible>>(32);

    tokio::spawn(async move {
        let start_time = Instant::now();
        let _ = run_debug_stream(&sub, &format, &tx).await;

        // Done step
        let elapsed = start_time.elapsed().as_millis() as u64;
        let _ = send_event(
            &tx,
            json!({ "type": "done", "data": { "totalDurationMs": elapsed } }),
        )
        .await;
    });

    let stream = ReceiverStream::new(rx);
    Sse::new(stream).keep_alive(KeepAlive::default()).into_response()
}

async fn send_event(tx: &mpsc::Sender<Result<Event, Infallible>>, data: Value) -> bool {
    let json_str = serde_json::to_string(&data).unwrap_or_default();
    tx.send(Ok(Event::default().data(json_str))).await.is_ok()
}

#[allow(clippy::too_many_lines)]
async fn run_debug_stream(
    sub: &proxy_subscribes::Model,
    format: &str,
    tx: &mpsc::Sender<Result<Event, Infallible>>,
) -> Result<(), ()> {
    let filter = get_filters(sub);
    let groups = get_groups(sub);
    let items = parse_subscribe_items(sub);
    let dns = resolve_dns_config(sub.use_system_dns_config, sub.dns_config.as_deref());

    let rule_providers: Map<String, Value> = if sub.use_system_rule_list {
        parse_jsonc(DEFAULT_RULE_PROVIDERS_JSON, Map::new())
    } else {
        let custom: Map<String, Value> =
            safe_parse_jsonc(sub.rule_list.as_deref(), Map::new());
        if custom.is_empty() {
            parse_jsonc(DEFAULT_RULE_PROVIDERS_JSON, Map::new())
        } else {
            custom
        }
    };

    let custom_config: Vec<Value> = if sub.use_system_custom_config {
        parse_jsonc(DEFAULT_CUSTOM_CONFIG_JSON, Vec::new())
    } else {
        safe_parse_jsonc(sub.custom_config.as_deref(), Vec::new())
    };

    let servers: Vec<Value> = safe_parse_jsonc(sub.servers.as_deref(), Vec::new());

    let subscribe_urls: Vec<String> = items
        .iter()
        .filter(|i| i.enabled != Some(false))
        .map(|i| i.url.clone())
        .collect();

    // Step 1: config
    if !send_event(
        tx,
        json!({
            "type": "config",
            "data": {
                "subscribeUrls": subscribe_urls,
                "filters": filter,
                "groups": groups,
                "ruleProviders": rule_providers,
                "customConfig": custom_config,
                "servers": servers,
                "dnsConfig": {
                    "shared": {
                        "localDns": dns.shared.local_dns,
                        "localDnsPort": dns.shared.local_dns_port,
                        "fakeipIpv4Range": dns.shared.fakeip_ipv4_range,
                        "fakeipIpv6Range": dns.shared.fakeip_ipv6_range,
                        "fakeipEnabled": dns.shared.fakeip_enabled,
                        "fakeipTtl": dns.shared.fakeip_ttl,
                        "dnsListenPort": dns.shared.dns_listen_port,
                        "tproxyPort": dns.shared.tproxy_port,
                        "rejectHttps": dns.shared.reject_https,
                        "cnDomainLocalDns": dns.shared.cn_domain_local_dns,
                        "clashApiPort": dns.shared.clash_api_port,
                        "clashApiSecret": dns.shared.clash_api_secret,
                        "clashApiUiPath": dns.shared.clash_api_ui_path,
                    },
                    "overrides": dns.overrides,
                }
            }
        }),
    )
    .await
    {
        return Err(());
    }

    let exclude_types: Vec<&str> = match format {
        "sing-box" => vec!["ssr", "anytls"],
        _ => vec!["ssr"],
    };

    // Step 2: manual-servers
    let mut manual_nodes: Vec<Value> = Vec::new();
    let mut all_proxies: Vec<ClashProxy> = Vec::new();
    for item in &servers {
        let proxy = match item {
            Value::String(s) => serde_yaml::from_str::<ClashProxy>(s).ok(),
            Value::Object(_) => serde_json::from_value::<ClashProxy>(item.clone()).ok(),
            _ => None,
        };
        if let Some(mut p) = proxy {
            p.name = append_icon(&p.name);
            manual_nodes.push(make_preview_node(&p, 0, "manual"));
            if !exclude_types.contains(&p.proxy_type.as_str()) {
                all_proxies.push(p);
            }
        }
    }

    if !send_event(
        tx,
        json!({
            "type": "manual-servers",
            "data": {
                "count": manual_nodes.len(),
                "nodes": manual_nodes,
            }
        }),
    )
    .await
    {
        return Err(());
    }

    // Step 3+: remote sources
    let client = build_http_client();
    let mut total_before_filter: usize = all_proxies.len();
    let mut total_filtered: usize = 0;

    for (idx, item) in items.iter().enumerate() {
        if item.enabled == Some(false) {
            continue;
        }
        let source_index = idx + 1;
        let ua = engine::resolve_ua(item.fetch_ua.as_deref());

        // source-start
        if !send_event(
            tx,
            json!({
                "type": "source-start",
                "data": {
                    "sourceIndex": source_index,
                    "url": item.url,
                    "ua": ua,
                }
            }),
        )
        .await
        {
            return Err(());
        }

        let fetch_start = Instant::now();
        let cache_ttl = item
            .cache_ttl_minutes
            .or(sub.cache_ttl_minutes)
            .unwrap_or(60);

        let cached_text = cache::get(&item.url, &ua, cache_ttl);
        let is_cached = cached_text.is_some();

        let (text, http_status, http_headers, fetch_error) = if let Some(cached) = cached_text {
            (cached, None, Map::new(), None)
        } else {
            match client.get(&item.url).header("User-Agent", &ua).send().await {
                Ok(resp) => {
                    let status = resp.status().as_u16();
                    let headers: Map<String, Value> = resp
                        .headers()
                        .iter()
                        .filter_map(|(k, v)| {
                            v.to_str()
                                .ok()
                                .map(|val| (k.to_string(), Value::String(val.to_string())))
                        })
                        .collect();
                    match resp.text().await {
                        Ok(text) => {
                            // Cache write moved after parsing (only when >0 nodes)
                            (text, Some(status), headers, None)
                        }
                        Err(e) => (String::new(), Some(status), headers, Some(e.to_string())),
                    }
                }
                Err(e) => (String::new(), None, Map::new(), Some(e.to_string())),
            }
        };

        let fetch_duration = fetch_start.elapsed().as_millis() as u64;
        let source_format = if fetch_error.is_some() {
            "unknown"
        } else {
            detect_format(&text)
        };

        let mut parsed = if fetch_error.is_some() {
            Vec::new()
        } else {
            parse_subscription(&text)
        };

        // Write to cache only after successful parse with >0 nodes (avoids caching failures)
        if !is_cached && !parsed.is_empty()
            && let Some(status) = http_status {
                cache::set(&item.url, &ua, text.clone(), status);
            }

        let normalized_prefix = normalize_prefix(&item.prefix);
        if !normalized_prefix.is_empty() {
            for p in &mut parsed {
                p.name = format!("{}{}", normalized_prefix, p.name);
            }
        }

        // Build before-filter list (with icons)
        let nodes_before_filter: Vec<Value> = parsed
            .iter()
            .map(|p| {
                let mut p2 = p.clone();
                p2.name = append_icon(&p2.name);
                make_preview_node(&p2, source_index, &item.url)
            })
            .collect();

        total_before_filter += parsed.len();

        // Apply filter
        let mut nodes_after: Vec<Value> = Vec::new();
        let mut filtered_nodes: Vec<Value> = Vec::new();

        for p in &parsed {
            let enriched_name = append_icon(&p.name);
            let matched_filter = filter.iter().find(|f| enriched_name.contains(f.as_str()));
            let type_excluded = exclude_types.contains(&p.proxy_type.as_str());

            if matched_filter.is_some() || type_excluded {
                let mut p2 = p.clone();
                p2.name = enriched_name;
                let rule = matched_filter
                    .cloned()
                    .unwrap_or_else(|| format!("type:{}", p.proxy_type));
                filtered_nodes.push(json!({
                    "node": make_preview_node(&p2, source_index, &item.url),
                    "matchedRule": rule,
                }));
                total_filtered += 1;
            } else {
                let mut p2 = p.clone();
                p2.name = enriched_name;
                nodes_after.push(make_preview_node(&p2, source_index, &item.url));
                all_proxies.push(p2);
            }
        }

        // source-result
        let decoded_text = if source_format == "base64" {
            parser::lenient_base64_decode(text.trim())
                .and_then(|b| String::from_utf8(b).ok())
        } else {
            None
        };
        if !send_event(
            tx,
            json!({
                "type": "source-result",
                "data": {
                    "sourceIndex": source_index,
                    "url": item.url,
                    "httpStatus": http_status,
                    "httpHeaders": http_headers,
                    "rawText": text,
                    "decodedText": decoded_text,
                    "format": source_format,
                    "parsedNodeCount": parsed.len(),
                    "nodesBeforeFilter": nodes_before_filter,
                    "nodesAfterFilter": nodes_after,
                    "filteredNodes": filtered_nodes,
                    "error": fetch_error,
                    "fetchDurationMs": fetch_duration,
                    "cached": is_cached,
                }
            }),
        )
        .await
        {
            return Err(());
        }
    }

    // Step: merge — with per-node entropy-loss warnings for sing-box
    let final_node_names: Vec<String> = all_proxies.iter().map(|p| p.name.clone()).collect();
    let mut node_warnings: Vec<String> = Vec::new();
    let mut node_ignored: Vec<String> = Vec::new();
    if format == "sing-box" || format == "sing-box-v12" {
        for p in &all_proxies {
            let (_, lost, ignored) = convert_clash_proxy_to_singbox_with_diff(p);
            if !lost.is_empty() {
                node_warnings.push(p.name.clone());
            } else if !ignored.is_empty() {
                node_ignored.push(p.name.clone());
            }
        }
    }
    if !send_event(
        tx,
        json!({
            "type": "merge",
            "data": {
                "totalNodesBeforeFilter": total_before_filter,
                "totalNodesAfterFilter": all_proxies.len(),
                "totalFiltered": total_filtered,
                "finalNodeNames": final_node_names,
                "nodeWarnings": node_warnings,
                "nodeIgnored": node_ignored,
            }
        }),
    )
    .await
    {
        return Err(());
    }

    // Step: output (build the actual config)
    let proxies_for_config: Vec<ClashProxy> = all_proxies;
    let (proxy_group_count, rule_count, rule_provider_count, config_output) = match format {
        "clash" => {
            let config_str = engine::build_clash_config(sub, &proxies_for_config, false);
            let parsed: Value =
                serde_yaml::from_str(&config_str).unwrap_or(Value::Null);
            let pg = parsed
                .get("proxy-groups")
                .and_then(|v| v.as_array())
                .map_or(0, std::vec::Vec::len);
            let rc = parsed
                .get("rules")
                .and_then(|v| v.as_array())
                .map_or(0, std::vec::Vec::len);
            let rp = parsed
                .get("rule-providers")
                .and_then(|v| v.as_object())
                .map_or(0, serde_json::Map::len);
            (pg, rc, rp, config_str)
        }
        "clash-meta" => {
            let config_str = engine::build_clash_config(sub, &proxies_for_config, true);
            let parsed: Value =
                serde_yaml::from_str(&config_str).unwrap_or(Value::Null);
            let pg = parsed
                .get("proxy-groups")
                .and_then(|v| v.as_array())
                .map_or(0, std::vec::Vec::len);
            let rc = parsed
                .get("rules")
                .and_then(|v| v.as_array())
                .map_or(0, std::vec::Vec::len);
            let rp = parsed
                .get("rule-providers")
                .and_then(|v| v.as_object())
                .map_or(0, serde_json::Map::len);
            (pg, rc, rp, config_str)
        }
        "sing-box" | "sing-box-v12" => {
            let is_v12 = format == "sing-box-v12";
            let public_url = std::env::var("PUBLIC_SERVER_URL").unwrap_or_default();
            let config =
                engine::build_singbox_config(sub, &proxies_for_config, is_v12, &public_url);
            let pg = config
                .get("outbounds")
                .and_then(|v| v.as_array())
                .map_or(0, |a| {
                    a.iter()
                        .filter(|o| {
                            o.get("type").and_then(|t| t.as_str()) == Some("selector")
                        })
                        .count()
                });
            let rc = config
                .get("route")
                .and_then(|r| r.get("rules"))
                .and_then(|v| v.as_array())
                .map_or(0, std::vec::Vec::len);
            let rp = config
                .get("route")
                .and_then(|r| r.get("rule_set"))
                .and_then(|v| v.as_array())
                .map_or(0, std::vec::Vec::len);
            let config_str = serde_json::to_string_pretty(&config).unwrap_or_default();
            (pg, rc, rp, config_str)
        }
        _ => (0, 0, 0, String::new()),
    };

    if !send_event(
        tx,
        json!({
            "type": "output",
            "data": {
                "proxyGroupCount": proxy_group_count,
                "ruleCount": rule_count,
                "ruleProviderCount": rule_provider_count,
                "configOutput": config_output,
            }
        }),
    )
    .await
    {
        return Err(());
    }

    // Step: validate — run real binary check on the generated config
    let validation = validator::validate_config(&config_output, format).await;
    if !send_event(
        tx,
        json!({
            "type": "validate",
            "data": validation.to_json(),
        }),
    )
    .await
    {
        return Err(());
    }

    // Step: rule-sets — fetch and parse each rule provider URL
    let rule_set_items = fetch_rule_sets(&rule_providers, format, &config_output).await;
    let total_count = rule_set_items.len();
    let total_rules: usize = rule_set_items
        .iter()
        .filter_map(|v| v.get("ruleCount").and_then(sea_orm::JsonValue::as_u64))
        .map(|n| n as usize)
        .sum();
    let error_count = rule_set_items
        .iter()
        .filter(|v| v.get("status").and_then(|s| s.as_str()) == Some("error"))
        .count();

    if !send_event(
        tx,
        json!({
            "type": "rule-sets",
            "data": {
                "totalCount": total_count,
                "totalRules": total_rules,
                "errorCount": error_count,
                "items": rule_set_items,
            }
        }),
    )
    .await
    {
        return Err(());
    }

    Ok(())
}

// ─── Rule-set fetching & parsing ───

/// Maximum response body size to read (2 MB).
const MAX_BODY_SIZE: usize = 2 * 1024 * 1024;
/// Built-in geoip/geosite JSON can be large (geosite-cn ~3MB)
const MAX_BUILTIN_BODY_SIZE: usize = 10 * 1024 * 1024;

/// Fetch and parse all rule provider URLs concurrently.
///
/// For sing-box formats, computes `effectiveUrl` (convert endpoint) and appends
/// built-in geoip/geosite entries as skipped markers.
async fn fetch_rule_sets(
    rule_providers: &Map<String, Value>,
    format: &str,
    config_output: &str,
) -> Vec<Value> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(15))
        .build()
        .unwrap_or_default();

    let is_singbox = format.starts_with("sing-box");
    let is_v12 = format == "sing-box-v12";

    // Build effective URL base for sing-box
    let convert_base = if is_singbox {
        let public_url = std::env::var("PUBLIC_SERVER_URL").unwrap_or_default();
        if is_v12 {
            format!("{public_url}/api/proxy/sing-box/convert/rule/12")
        } else {
            format!("{public_url}/api/proxy/sing-box/convert/rule")
        }
    } else {
        String::new()
    };

    // Collect (group, name, url, effective_url) tuples
    let mut tasks: Vec<(String, String, String, Option<String>)> = Vec::new();
    for (group_name, items) in rule_providers {
        if let Some(arr) = items.as_array() {
            for item in arr {
                let name = item
                    .get("name")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();
                let url = item
                    .get("url")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();
                if !url.is_empty() {
                    let effective = if is_singbox {
                        Some(format!(
                            "{}?url={}",
                            convert_base,
                            urlencoding::encode(&url)
                        ))
                    } else {
                        None
                    };
                    tasks.push((group_name.clone(), name, url, effective));
                }
            }
        }
    }

    // Fetch all URLs concurrently
    let mut join_set = tokio::task::JoinSet::new();
    for (group, tag, url, effective_url) in tasks {
        let client = client.clone();
        let filter_process_rules = is_singbox;
        join_set.spawn(async move {
            match client.get(&url).send().await {
                Ok(resp) => {
                    let status = resp.status().as_u16();
                    // Read body with size limit
                    let body = read_body_limited(resp, MAX_BODY_SIZE).await;
                    match body {
                        Ok(text) if status < 400 => {
                            let mut rules = parse_rule_provider_yaml(&text);
                            // For sing-box, filter out PROCESS-NAME/PATH rules
                            if filter_process_rules {
                                rules.retain(|r| !is_singbox_excluded_rule(r));
                            }
                            let rule_count = rules.len();
                            let all_rules: Vec<Value> = rules
                                .into_iter()
                                .map(|s| json!(s))
                                .collect();
                            json!({
                                "tag": tag,
                                "url": url,
                                "effectiveUrl": effective_url,
                                "group": group,
                                "status": "ok",
                                "httpStatus": status,
                                "ruleCount": rule_count,
                                "sampleRules": all_rules,
                            })
                        }
                        Ok(_) => json!({
                            "tag": tag,
                            "url": url,
                            "effectiveUrl": effective_url,
                            "group": group,
                            "status": "error",
                            "error": format!("HTTP {}", status),
                            "httpStatus": status,
                            "ruleCount": 0,
                        }),
                        Err(e) => json!({
                            "tag": tag,
                            "url": url,
                            "effectiveUrl": effective_url,
                            "group": group,
                            "status": "error",
                            "error": e,
                            "ruleCount": 0,
                        }),
                    }
                }
                Err(e) => {
                    let error_msg = if e.is_timeout() {
                        "Request timed out".to_string()
                    } else {
                        e.to_string()
                    };
                    json!({
                        "tag": tag,
                        "url": url,
                        "effectiveUrl": effective_url,
                        "group": group,
                        "status": "error",
                        "error": error_msg,
                        "ruleCount": 0,
                    })
                }
            }
        });
    }

    let mut results: Vec<Value> = Vec::new();
    while let Some(res) = join_set.join_next().await {
        if let Ok(val) = res {
            results.push(val);
        }
    }

    // Sort results by group name for consistent ordering
    results.sort_by(|a, b| {
        let ga = a.get("group").and_then(|v| v.as_str()).unwrap_or("");
        let gb = b.get("group").and_then(|v| v.as_str()).unwrap_or("");
        ga.cmp(gb)
    });

    // For sing-box, fetch built-in geoip/geosite rule sets (use JSON alternatives)
    if is_singbox {
        let builtin_results = fetch_builtin_rule_sets(&client, config_output).await;
        results.extend(builtin_results);
    }

    results
}

/// Derive a JSON URL from a sing-box .srs binary URL for rule set parsing.
///
/// Maps known CDN patterns to MetaCubeX JSON alternatives:
/// - `sing-geoip@rule-set/geoip-XX.srs` → MetaCubeX `geo/geoip/XX.json`
/// - `sing-geosite@rule-set/geosite-XX.srs` → MetaCubeX `geo/geosite/XX.json`
fn derive_json_url(srs_url: &str) -> Option<String> {
    const META_BASE: &str =
        "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/sing/geo";
    // geoip pattern: .../geoip-XX.srs
    if let Some(pos) = srs_url.rfind("/geoip-") {
        let after = &srs_url[pos + 7..]; // skip "/geoip-"
        if let Some(name) = after.strip_suffix(".srs") {
            return Some(format!("{META_BASE}/geoip/{name}.json"));
        }
    }
    // geosite pattern: .../geosite-XX.srs
    if let Some(pos) = srs_url.rfind("/geosite-") {
        let after = &srs_url[pos + 9..]; // skip "/geosite-"
        if let Some(name) = after.strip_suffix(".srs") {
            return Some(format!("{META_BASE}/geosite/{name}.json"));
        }
    }
    None
}

/// Extract built-in rule sets from the generated sing-box config and fetch JSON alternatives.
async fn fetch_builtin_rule_sets(client: &reqwest::Client, config_output: &str) -> Vec<Value> {
    // Parse the generated config to find route.rule_set entries
    let config: Value = match serde_json::from_str(config_output) {
        Ok(v) => v,
        Err(_) => return Vec::new(),
    };
    let rule_sets = config
        .get("route")
        .and_then(|r| r.get("rule_set"))
        .and_then(|v| v.as_array());
    let Some(rule_sets) = rule_sets else {
        return Vec::new();
    };

    // Find remote binary rule sets (these are the built-in geoip/geosite ones)
    let mut builtin_entries: Vec<(String, String, Option<String>)> = Vec::new();
    for rs in rule_sets {
        let rs_type = rs.get("type").and_then(|v| v.as_str()).unwrap_or("");
        let rs_format = rs.get("format").and_then(|v| v.as_str()).unwrap_or("");
        if rs_type != "remote" || rs_format != "binary" {
            continue;
        }
        let tag = rs.get("tag").and_then(|v| v.as_str()).unwrap_or("").to_string();
        let url = rs.get("url").and_then(|v| v.as_str()).unwrap_or("").to_string();
        if tag.is_empty() {
            continue;
        }
        let json_url = derive_json_url(&url);
        builtin_entries.push((tag, url, json_url));
    }

    let mut results = Vec::new();
    let mut join_set = tokio::task::JoinSet::new();
    for (tag, srs_url, json_url) in builtin_entries {
        let Some(json_url) = json_url else {
            // No JSON alternative available — mark as skipped binary
            results.push(json!({
                "tag": tag,
                "url": srs_url,
                "group": "built-in",
                "status": "skipped",
                "ruleCount": 0,
                "builtin": true,
                "format": "binary",
            }));
            continue;
        };
        let client = client.clone();
        join_set.spawn(async move {
            match client.get(&json_url).send().await {
                Ok(resp) if resp.status().is_success() => {
                    match read_body_limited(resp, MAX_BUILTIN_BODY_SIZE).await {
                        Ok(text) => {
                            let mut rules = parse_singbox_ruleset_json(&text);
                            // Filter out PROCESS-NAME/PATH rules (they crash sing-box mobile clients)
                            rules.retain(|r| !is_singbox_excluded_rule(r));
                            let rule_count = rules.len();
                            let all_rules: Vec<Value> =
                                rules.into_iter().map(|s| json!(s)).collect();
                            json!({
                                "tag": tag,
                                "url": srs_url,
                                "group": "built-in",
                                "status": "ok",
                                "ruleCount": rule_count,
                                "sampleRules": all_rules,
                                "builtin": true,
                            })
                        }
                        Err(e) => json!({
                            "tag": tag,
                            "url": srs_url,
                            "group": "built-in",
                            "status": "error",
                            "error": e,
                            "ruleCount": 0,
                            "builtin": true,
                        }),
                    }
                }
                Ok(resp) => json!({
                    "tag": tag,
                    "url": srs_url,
                    "group": "built-in",
                    "status": "error",
                    "error": format!("HTTP {}", resp.status().as_u16()),
                    "ruleCount": 0,
                    "builtin": true,
                }),
                Err(e) => json!({
                    "tag": tag,
                    "url": srs_url,
                    "group": "built-in",
                    "status": "error",
                    "error": e.to_string(),
                    "ruleCount": 0,
                    "builtin": true,
                }),
            }
        });
    }
    while let Some(res) = join_set.join_next().await {
        if let Ok(val) = res {
            results.push(val);
        }
    }

    results
}

/// Read response body with size limit to prevent OOM.
async fn read_body_limited(resp: reqwest::Response, max_size: usize) -> Result<String, String> {
    let content_length = resp.content_length().unwrap_or(0) as usize;
    if content_length > max_size {
        return Err(format!("Response too large: {content_length} bytes"));
    }
    let bytes = resp
        .bytes()
        .await
        .map_err(|e| format!("Failed to read response: {e}"))?;
    if bytes.len() > max_size {
        return Err(format!("Response too large: {} bytes", bytes.len()));
    }
    String::from_utf8(bytes.to_vec())
        .map_err(|_| "Response is not valid UTF-8".to_string())
}

/// Returns true if the rule line is a PROCESS-NAME or PROCESS-PATH rule
/// that should be excluded from sing-box output (they crash sing-box mobile clients).
fn is_singbox_excluded_rule(rule: &str) -> bool {
    rule.starts_with("PROCESS-NAME,") || rule.starts_with("PROCESS-PATH,")
}

/// Parse a Clash-format rule provider YAML.
///
/// Typical format:
/// ```yaml
/// payload:
///   - DOMAIN-SUFFIX,apple.com
///   - DOMAIN,apple.com
///   - IP-CIDR,17.0.0.0/8
/// ```
///
/// Falls back to line-based parsing if `payload:` key is not found.
fn parse_rule_provider_yaml(text: &str) -> Vec<String> {
    // Try parsing as YAML with payload key
    if let Ok(parsed) = serde_yaml::from_str::<serde_yaml::Value>(text)
        && let Some(payload) = parsed.get("payload").and_then(|v| v.as_sequence()) {
            return payload
                .iter()
                .filter_map(|v| match v {
                    serde_yaml::Value::String(s) => Some(s.clone()),
                    _ => None,
                })
                .collect();
        }

    // Fallback: treat non-empty, non-comment lines as rules
    text.lines()
        .map(str::trim)
        .filter(|l| !l.is_empty() && !l.starts_with('#') && !l.starts_with("payload:"))
        .map(|l| l.strip_prefix("- ").unwrap_or(l).to_string())
        .collect()
}

/// Parse a sing-box JSON rule set file.
///
/// Typical format:
/// ```json
/// { "version": 2, "rules": [{ "ip_cidr": ["1.0.1.0/24", ...] }, { "domain_suffix": [".cn", ...] }] }
/// ```
///
/// Extracts individual rules from each rule object's arrays.
fn parse_singbox_ruleset_json(text: &str) -> Vec<String> {
    let Ok(parsed) = serde_json::from_str::<Value>(text) else {
        return vec![];
    };
    let Some(rules) = parsed.get("rules").and_then(|v| v.as_array()) else {
        return vec![];
    };
    let mut result = Vec::new();
    for rule_obj in rules {
        let Some(obj) = rule_obj.as_object() else {
            continue;
        };
        for (rule_type, values) in obj {
            if let Some(arr) = values.as_array() {
                for val in arr {
                    if let Some(s) = val.as_str() {
                        result.push(format!("{rule_type},{s}"));
                    }
                }
            }
        }
    }
    result
}