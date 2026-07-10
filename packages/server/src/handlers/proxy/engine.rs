use serde::Deserialize;
use serde_json::{Map, Value, json};
use std::net::IpAddr;
use tracing::warn;

use crate::db::entities::proxy_subscribes;

use super::converter::convert_clash_proxy_to_singbox;
use super::fetch_subscription;
use super::icons::append_icon;
use super::types::ClashProxy;
use super::{
    DEFAULT_CUSTOM_CONFIG_JSON, DEFAULT_FILTER_JSON, DEFAULT_GROUPS_JSON,
    DEFAULT_RULE_PROVIDERS_JSON,
};

/// Default User-Agent for fetching subscription URLs.
/// Many providers block requests without a recognized proxy client UA.
/// Using clash.meta — widely supported by providers (ClashforWindows is deprecated).
pub(super) const DEFAULT_FETCH_UA: &str = "clash.meta";

/// Resolve effective UA: use per-item value if non-empty, otherwise default.
pub(super) fn resolve_ua(fetch_ua: Option<&str>) -> String {
    match fetch_ua {
        Some(ua) if !ua.trim().is_empty() => ua.trim().to_string(),
        _ => DEFAULT_FETCH_UA.to_string(),
    }
}

// ─── JSONC helpers ───

/// Strip `//` line comments and `/* ... */` block comments from JSONC text.
fn strip_json_comments(input: &str) -> String {
    let mut out = String::with_capacity(input.len());
    let chars: Vec<char> = input.chars().collect();
    let len = chars.len();
    let mut i = 0;
    let mut in_string = false;

    while i < len {
        if in_string {
            out.push(chars[i]);
            if chars[i] == '\\' && i + 1 < len {
                out.push(chars[i + 1]);
                i += 2;
                continue;
            }
            if chars[i] == '"' {
                in_string = false;
            }
            i += 1;
            continue;
        }

        if chars[i] == '"' {
            in_string = true;
            out.push(chars[i]);
            i += 1;
            continue;
        }

        // Line comment
        if i + 1 < len && chars[i] == '/' && chars[i + 1] == '/' {
            while i < len && chars[i] != '\n' {
                i += 1;
            }
            continue;
        }

        // Block comment
        if i + 1 < len && chars[i] == '/' && chars[i + 1] == '*' {
            i += 2;
            while i + 1 < len && !(chars[i] == '*' && chars[i + 1] == '/') {
                i += 1;
            }
            if i + 1 < len {
                i += 2; // skip */
            }
            continue;
        }

        out.push(chars[i]);
        i += 1;
    }
    out
}

/// Parse JSONC string, returning default on failure.
pub(super) fn parse_jsonc<T: serde::de::DeserializeOwned>(jsonc: &str, default: T) -> T {
    let cleaned = strip_json_comments(jsonc);
    serde_json::from_str(&cleaned).unwrap_or(default)
}

pub(super) fn safe_parse_jsonc<T: serde::de::DeserializeOwned>(
    jsonc: Option<&str>,
    default: T,
) -> T {
    match jsonc {
        Some(s) if !s.is_empty() => parse_jsonc(s, default),
        _ => default,
    }
}

/// Parse subscribe_url which may be a plain URL string or a JSON array of URLs.
pub(super) fn parse_subscribe_url(url: &str) -> Vec<String> {
    let trimmed = url.trim();
    if trimmed.is_empty() {
        return Vec::new();
    }
    // Try as JSON array first (legacy format: ["url1", "url2"])
    if trimmed.starts_with('[')
        && let Ok(urls) = serde_json::from_str::<Vec<String>>(trimmed)
    {
        return urls.into_iter().filter(|u| !u.is_empty()).collect();
    }
    // Plain URL string
    vec![trimmed.to_string()]
}

// ─── DNS config resolution ───

#[derive(Debug)]
pub(super) struct DnsShared {
    pub(super) local_dns: String,
    pub(super) local_dns_port: u64,
    pub(super) fakeip_ipv4_range: String,
    pub(super) fakeip_ipv6_range: String,
    pub(super) fakeip_enabled: bool,
    pub(super) fakeip_ttl: u64,
    pub(super) dns_listen_port: u64,
    pub(super) tproxy_port: u64,
    pub(super) reject_https: bool,
    pub(super) cn_domain_local_dns: bool,
    pub(super) clash_api_port: u64,
    pub(super) clash_api_secret: String,
    pub(super) clash_api_ui_path: String,
}

impl Default for DnsShared {
    fn default() -> Self {
        Self {
            local_dns: "127.0.0.1".into(),
            local_dns_port: 53,
            fakeip_ipv4_range: "198.18.0.0/15".into(),
            fakeip_ipv6_range: "fc00::/18".into(),
            fakeip_enabled: true,
            fakeip_ttl: 300,
            dns_listen_port: 1053,
            tproxy_port: 7893,
            reject_https: true,
            cn_domain_local_dns: true,
            clash_api_port: 9999,
            clash_api_secret: "123456".into(),
            clash_api_ui_path: "/etc/sb/ui".into(),
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

fn dns_shared_from_value(v: &Value) -> DnsShared {
    let d = DnsShared::default();
    let Some(obj) = v.as_object() else {
        return d;
    };
    DnsShared {
        local_dns: obj
            .get("localDns")
            .and_then(|v| v.as_str())
            .unwrap_or(&d.local_dns)
            .to_string(),
        local_dns_port: obj
            .get("localDnsPort")
            .and_then(sea_orm::JsonValue::as_u64)
            .unwrap_or(d.local_dns_port),
        fakeip_ipv4_range: obj
            .get("fakeipIpv4Range")
            .and_then(|v| v.as_str())
            .unwrap_or(&d.fakeip_ipv4_range)
            .to_string(),
        fakeip_ipv6_range: obj
            .get("fakeipIpv6Range")
            .and_then(|v| v.as_str())
            .unwrap_or(&d.fakeip_ipv6_range)
            .to_string(),
        fakeip_enabled: obj
            .get("fakeipEnabled")
            .and_then(sea_orm::JsonValue::as_bool)
            .unwrap_or(d.fakeip_enabled),
        fakeip_ttl: obj
            .get("fakeipTtl")
            .and_then(sea_orm::JsonValue::as_u64)
            .unwrap_or(d.fakeip_ttl),
        dns_listen_port: obj
            .get("dnsListenPort")
            .and_then(sea_orm::JsonValue::as_u64)
            .unwrap_or(d.dns_listen_port),
        tproxy_port: obj
            .get("tproxyPort")
            .and_then(sea_orm::JsonValue::as_u64)
            .unwrap_or(d.tproxy_port),
        reject_https: obj
            .get("rejectHttps")
            .and_then(sea_orm::JsonValue::as_bool)
            .unwrap_or(d.reject_https),
        cn_domain_local_dns: obj
            .get("cnDomainLocalDns")
            .and_then(sea_orm::JsonValue::as_bool)
            .unwrap_or(d.cn_domain_local_dns),
        clash_api_port: obj
            .get("clashApiPort")
            .and_then(sea_orm::JsonValue::as_u64)
            .unwrap_or(d.clash_api_port),
        clash_api_secret: obj
            .get("clashApiSecret")
            .and_then(|v| v.as_str())
            .unwrap_or(&d.clash_api_secret)
            .to_string(),
        clash_api_ui_path: obj
            .get("clashApiUiPath")
            .and_then(|v| v.as_str())
            .unwrap_or(&d.clash_api_ui_path)
            .to_string(),
    }
}

pub(super) struct ResolvedDns {
    pub(super) shared: DnsShared,
    pub(super) overrides: Map<String, Value>,
}

pub(super) fn resolve_dns_config(use_system: bool, dns_config_jsonc: Option<&str>) -> ResolvedDns {
    let defaults = ResolvedDns {
        shared: DnsShared::default(),
        overrides: Map::new(),
    };
    if use_system || dns_config_jsonc.is_none() {
        return defaults;
    }
    let jsonc = dns_config_jsonc.unwrap();
    let parsed: Value = parse_jsonc(jsonc, Value::Null);
    let Some(obj) = parsed.as_object() else {
        return defaults;
    };

    let shared_val = obj.get("shared").cloned().unwrap_or(Value::Null);
    let shared = dns_shared_from_value(&shared_val);

    let mut overrides = Map::new();
    if let Some(ov) = obj.get("overrides").and_then(|v| v.as_object()) {
        for key in &["singbox", "singboxV12", "clash", "clashMeta"] {
            if let Some(v) = ov.get(*key)
                && !v.is_null()
            {
                overrides.insert(key.to_string(), v.clone());
            }
        }
    }

    ResolvedDns { shared, overrides }
}

// ─── Private access config resolution ───

fn default_true() -> bool {
    true
}

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PrivateAccessConfig {
    #[serde(default)]
    enabled: bool,
    #[serde(default)]
    connectors: Vec<PrivateConnector>,
}

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PrivateConnector {
    #[serde(default = "default_true")]
    enabled: bool,
    tag: Option<String>,
    #[serde(rename = "type")]
    connector_type: Option<String>,
    endpoint: Option<Value>,
    outbound: Option<Value>,
    routes: Option<PrivateRouteMatcher>,
    #[serde(default)]
    dns: Vec<PrivateDnsRule>,
}

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PrivateRouteMatcher {
    #[serde(default)]
    ip_cidrs: Vec<String>,
    #[serde(default)]
    domains: Vec<String>,
    #[serde(default)]
    domain_suffixes: Vec<String>,
    #[serde(default)]
    domain_keywords: Vec<String>,
    #[serde(default)]
    domain_regexes: Vec<String>,
}

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PrivateDnsRule {
    tag: Option<String>,
    #[serde(default)]
    domains: Vec<String>,
    #[serde(default)]
    domain_suffixes: Vec<String>,
    #[serde(default)]
    domain_keywords: Vec<String>,
    #[serde(default)]
    domain_regexes: Vec<String>,
    server: Option<String>,
    server_port: Option<u16>,
}

#[derive(Debug, Default)]
struct ResolvedPrivateAccess {
    endpoints: Vec<Value>,
    outbounds: Vec<Value>,
    direct_domains: Vec<String>,
    route_rules: Vec<Value>,
    dns_servers: Vec<Value>,
    dns_rules: Vec<Value>,
}

fn take_string_list(obj: &mut Map<String, Value>, from: &str, to: &str) {
    if obj.contains_key(to) {
        obj.remove(from);
        return;
    }
    if let Some(value) = obj.remove(from) {
        obj.insert(to.to_string(), value);
    }
}

fn normalize_private_access_value(value: &mut Value) {
    match value {
        Value::Object(obj) => {
            let aliases = [
                ("privateKey", "private_key"),
                ("publicKey", "public_key"),
                ("preSharedKey", "pre_shared_key"),
                ("allowedIps", "allowed_ips"),
                (
                    "persistentKeepaliveInterval",
                    "persistent_keepalive_interval",
                ),
                ("domainResolver", "domain_resolver"),
                ("serverPort", "server_port"),
                ("listenPort", "listen_port"),
                ("alterId", "alter_id"),
            ];
            for (from, to) in aliases {
                take_string_list(obj, from, to);
            }
            for item in obj.values_mut() {
                normalize_private_access_value(item);
            }
        }
        Value::Array(items) => {
            for item in items {
                normalize_private_access_value(item);
            }
        }
        _ => {}
    }
}

fn clean_string_list(values: Vec<String>) -> Vec<String> {
    values
        .into_iter()
        .map(|item| item.trim().to_string())
        .filter(|item| !item.is_empty())
        .collect()
}

fn add_route_matchers(rule: &mut Value, routes: Option<PrivateRouteMatcher>) -> bool {
    let Some(routes) = routes else {
        return false;
    };
    let Some(obj) = rule.as_object_mut() else {
        return false;
    };

    let ip_cidrs = clean_string_list(routes.ip_cidrs);
    let domains = clean_string_list(routes.domains);
    let domain_suffixes = clean_string_list(routes.domain_suffixes);
    let domain_keywords = clean_string_list(routes.domain_keywords);
    let domain_regexes = clean_string_list(routes.domain_regexes);

    if !ip_cidrs.is_empty() {
        obj.insert("ip_cidr".into(), json!(ip_cidrs));
    }
    if !domains.is_empty() {
        obj.insert("domain".into(), json!(domains));
    }
    if !domain_suffixes.is_empty() {
        obj.insert("domain_suffix".into(), json!(domain_suffixes));
    }
    if !domain_keywords.is_empty() {
        obj.insert("domain_keyword".into(), json!(domain_keywords));
    }
    if !domain_regexes.is_empty() {
        obj.insert("domain_regex".into(), json!(domain_regexes));
    }

    obj.len() > 2
}

fn add_dns_matchers(rule: &mut Value, dns: &PrivateDnsRule) -> bool {
    let Some(obj) = rule.as_object_mut() else {
        return false;
    };

    let domains = clean_string_list(dns.domains.clone());
    let domain_suffixes = clean_string_list(dns.domain_suffixes.clone());
    let domain_keywords = clean_string_list(dns.domain_keywords.clone());
    let domain_regexes = clean_string_list(dns.domain_regexes.clone());

    if !domains.is_empty() {
        obj.insert("domain".into(), json!(domains));
    }
    if !domain_suffixes.is_empty() {
        obj.insert("domain_suffix".into(), json!(domain_suffixes));
    }
    if !domain_keywords.is_empty() {
        obj.insert("domain_keyword".into(), json!(domain_keywords));
    }
    if !domain_regexes.is_empty() {
        obj.insert("domain_regex".into(), json!(domain_regexes));
    }

    obj.len() > 2
}

fn first_endpoint_domain(endpoint: &Value) -> Option<String> {
    let peers = endpoint.get("peers").and_then(Value::as_array)?;
    let host = peers
        .first()
        .and_then(|peer| peer.get("address"))
        .and_then(Value::as_str)?
        .trim();
    if is_domain_name(host) {
        Some(host.to_string())
    } else {
        None
    }
}

fn outbound_server_domain(outbound: &Value) -> Option<String> {
    let host = outbound.get("server").and_then(Value::as_str)?.trim();
    if is_domain_name(host) {
        Some(host.to_string())
    } else {
        None
    }
}

fn resolve_private_access_config(
    sub: &proxy_subscribes::Model,
    target: SingboxTarget,
) -> Option<ResolvedPrivateAccess> {
    if !target.uses_modern_dns() {
        return None;
    }

    let raw = sub.private_access_config.as_deref()?.trim();
    if raw.is_empty() {
        return None;
    }

    let cleaned = strip_json_comments(raw);
    let parsed: PrivateAccessConfig = match serde_json::from_str(&cleaned) {
        Ok(value) => value,
        Err(err) => {
            warn!("Ignoring invalid private access config JSONC: {err}");
            return None;
        }
    };
    if !parsed.enabled {
        return None;
    }

    let resolver = if target.is_windows() {
        "bootstrap"
    } else {
        "local"
    };
    let mut resolved = ResolvedPrivateAccess::default();

    for (idx, connector) in parsed.connectors.into_iter().enumerate() {
        if !connector.enabled {
            continue;
        }
        let tag = connector
            .tag
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(String::from)
            .unwrap_or_else(|| format!("private-access-{}", idx + 1));
        let connector_type = connector
            .connector_type
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .unwrap_or("outbound");

        match connector_type {
            "wireguard" | "tailscale" => {
                let Some(mut endpoint) = connector.endpoint else {
                    warn!("Ignoring private access endpoint {tag}: missing endpoint");
                    continue;
                };
                normalize_private_access_value(&mut endpoint);
                endpoint["type"] = json!(connector_type);
                endpoint["tag"] = json!(tag);

                if let Some(host) = first_endpoint_domain(&endpoint) {
                    push_unique(&mut resolved.direct_domains, host);
                    if endpoint.get("domain_resolver").is_none() {
                        endpoint["domain_resolver"] = json!({
                            "server": resolver,
                            "strategy": "ipv4_only"
                        });
                    }
                }
                resolved.endpoints.push(endpoint);
            }
            "outbound" | "v2ray" | "xray" | "vmess" | "vless" | "trojan" | "socks" | "socks5"
            | "http" | "ssh" | "hysteria2" | "tuic" | "anytls" => {
                let Some(mut outbound) = connector.outbound else {
                    warn!("Ignoring private access outbound {tag}: missing outbound");
                    continue;
                };
                normalize_private_access_value(&mut outbound);
                if !matches!(connector_type, "outbound" | "v2ray" | "xray") {
                    outbound["type"] = json!(connector_type);
                }
                outbound["tag"] = json!(tag);
                if let Some(host) = outbound_server_domain(&outbound) {
                    push_unique(&mut resolved.direct_domains, host);
                    if target.is_windows() && outbound.get("domain_resolver").is_none() {
                        outbound["domain_resolver"] = json!({
                            "server": "bootstrap",
                            "strategy": "ipv4_only"
                        });
                    }
                }
                resolved.outbounds.push(outbound);
            }
            _ => {
                warn!("Ignoring unsupported private access connector type: {connector_type}");
                continue;
            }
        }

        let mut route_rule = json!({
            "action": "route",
            "outbound": tag,
        });
        if add_route_matchers(&mut route_rule, connector.routes) {
            resolved.route_rules.push(route_rule);
        }

        let dns_rule_count = connector.dns.len();
        for (dns_idx, dns) in connector.dns.into_iter().enumerate() {
            let Some(server) = dns
                .server
                .as_deref()
                .map(str::trim)
                .filter(|v| !v.is_empty())
            else {
                continue;
            };
            let server_tag = dns
                .tag
                .as_deref()
                .map(str::trim)
                .filter(|v| !v.is_empty())
                .map(String::from)
                .unwrap_or_else(|| {
                    if dns_rule_count == 1 {
                        format!("{tag}-dns")
                    } else {
                        format!("{tag}-dns-{}", dns_idx + 1)
                    }
                });
            let mut dns_rule = json!({
                "action": "route",
                "server": server_tag,
            });
            if !add_dns_matchers(&mut dns_rule, &dns) {
                continue;
            }
            resolved.dns_servers.push(json!({
                "type": "udp",
                "tag": server_tag,
                "server": server,
                "server_port": dns.server_port.unwrap_or(53),
                "detour": tag,
            }));
            resolved.dns_rules.push(dns_rule);
        }
    }

    if resolved.endpoints.is_empty()
        && resolved.outbounds.is_empty()
        && resolved.route_rules.is_empty()
        && resolved.dns_rules.is_empty()
    {
        None
    } else {
        Some(resolved)
    }
}

fn apply_private_access_dns(dns_section: &mut Value, private_access: &ResolvedPrivateAccess) {
    let Some(dns_obj) = dns_section.as_object_mut() else {
        return;
    };
    let Some(servers) = dns_obj.get_mut("servers").and_then(Value::as_array_mut) else {
        return;
    };
    servers.extend(private_access.dns_servers.iter().cloned());

    let rules = dns_obj
        .entry("rules")
        .or_insert_with(|| Value::Array(Vec::new()));
    if let Some(rules) = rules.as_array_mut() {
        for rule in private_access.dns_rules.iter().rev() {
            rules.insert(0, rule.clone());
        }
    }
}

fn apply_private_access_routes(route_rules: &mut Value, private_access: &ResolvedPrivateAccess) {
    let Some(rules) = route_rules.as_array_mut() else {
        return;
    };

    let mut insert_at = rules
        .iter()
        .position(|rule| rule.get("ip_is_private").is_some())
        .unwrap_or(rules.len());

    if !private_access.direct_domains.is_empty() {
        rules.insert(
            insert_at,
            json!({
                "domain": private_access.direct_domains,
                "action": "route",
                "outbound": "🚀 直接连接"
            }),
        );
        insert_at += 1;
    }

    for rule in &private_access.route_rules {
        rules.insert(insert_at, rule.clone());
        insert_at += 1;
    }
}

fn private_access_outbounds(private_access: &Option<ResolvedPrivateAccess>) -> Vec<Value> {
    private_access
        .as_ref()
        .map(|access| access.outbounds.clone())
        .unwrap_or_default()
}

fn private_access_endpoints(private_access: &Option<ResolvedPrivateAccess>) -> Vec<Value> {
    private_access
        .as_ref()
        .map(|access| access.endpoints.clone())
        .unwrap_or_default()
}

fn private_access_direct_domains(private_access: &Option<ResolvedPrivateAccess>) -> Vec<Value> {
    private_access
        .as_ref()
        .map(|access| {
            access
                .direct_domains
                .iter()
                .map(|domain| json!(domain))
                .collect()
        })
        .unwrap_or_default()
}

// ─── Preview node ───

#[derive(serde::Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PreviewNode {
    pub name: String,
    #[serde(rename = "type")]
    pub proxy_type: String,
    pub server: String,
    pub port: u16,
    pub source_index: usize,
    pub source_url: String,
    pub raw: Value,
    #[serde(skip_serializing_if = "std::ops::Not::not")]
    pub filtered: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub filtered_by: Option<String>,
}

/// Fetch proxies with full metadata for preview UI.
pub async fn fetch_proxies_preview(
    sub: &proxy_subscribes::Model,
) -> Result<Vec<PreviewNode>, String> {
    let mut nodes: Vec<PreviewNode> = Vec::new();

    // 1. Parse manual servers (sourceIndex=0, sourceUrl="manual")
    let servers: Vec<Value> = safe_parse_jsonc(sub.servers.as_deref(), Vec::new());
    for item in &servers {
        let proxy = match item {
            Value::String(s) => serde_yaml::from_str::<ClashProxy>(s).ok(),
            Value::Object(_) => serde_json::from_value::<ClashProxy>(item.clone()).ok(),
            _ => None,
        };
        if let Some(p) = proxy {
            let mut p = p;
            p.name = append_icon(&p.name);
            let raw = serde_json::to_value(&p).unwrap_or_default();
            nodes.push(PreviewNode {
                name: p.name.clone(),
                proxy_type: p.proxy_type.clone(),
                server: p.server.clone(),
                port: p.port,
                source_index: 0,
                source_url: "manual".into(),
                raw,
                filtered: false,
                filtered_by: None,
            });
        }
    }

    // 2. Get subscribe items
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

    let items: Vec<SubItem> = if let Some(ref si) = sub.subscribe_items {
        serde_json::from_value(si.clone()).unwrap_or_default()
    } else if let Some(ref url) = sub.subscribe_url {
        parse_subscribe_url(url)
            .into_iter()
            .map(|u| SubItem {
                url: u,
                prefix: String::new(),
                enabled: Some(true),
                cache_ttl_minutes: None,
                fetch_ua: None,
            })
            .collect()
    } else {
        Vec::new()
    };

    // 3. Get filter
    let default_filter: Vec<String> = parse_jsonc(DEFAULT_FILTER_JSON, Vec::new());
    let filter: Vec<String> = if sub.use_system_filter {
        default_filter
    } else {
        safe_parse_jsonc(sub.filter.as_deref(), Vec::new())
    };

    // 4. Fetch each enabled item
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .unwrap_or_default();

    for (idx, item) in items.iter().enumerate() {
        if item.enabled == Some(false) {
            continue;
        }
        let source_index = idx + 1;
        let cache_ttl = item
            .cache_ttl_minutes
            .or(sub.cache_ttl_minutes)
            .unwrap_or(60);
        let ua = resolve_ua(item.fetch_ua.as_deref());

        let result =
            fetch_subscription::fetch_and_parse(&client, &item.url, &ua, cache_ttl, 3).await;
        let parsed = if let Some(r) = result {
            r.proxies
        } else {
            warn!(
                "Subscription source returned 0 nodes after retries: {}",
                item.url
            );
            continue;
        };

        let normalized_prefix = normalize_prefix(&item.prefix);
        for p in parsed {
            let mut p = p;
            if !normalized_prefix.is_empty() {
                p.name = format!("{}{}", normalized_prefix, p.name);
            }
            p.name = append_icon(&p.name);
            let matched_filter = filter.iter().find(|f| p.name.contains(f.as_str())).cloned();
            let raw = serde_json::to_value(&p).unwrap_or_default();
            nodes.push(PreviewNode {
                name: p.name.clone(),
                proxy_type: p.proxy_type.clone(),
                server: p.server.clone(),
                port: p.port,
                source_index,
                source_url: item.url.clone(),
                raw,
                filtered: matched_filter.is_some(),
                filtered_by: matched_filter,
            });
        }
    }

    Ok(nodes)
}

// ─── Fetch proxies ───

/// Fetch and parse all proxy nodes for a subscription record.
pub async fn fetch_proxies(
    sub: &proxy_subscribes::Model,
    format: &str,
) -> Result<Vec<ClashProxy>, String> {
    let mut proxies: Vec<ClashProxy> = Vec::new();

    // 1. Parse manual servers from JSONC
    let servers: Vec<Value> = safe_parse_jsonc(sub.servers.as_deref(), Vec::new());
    for item in &servers {
        match item {
            Value::String(s) => {
                if let Ok(p) = serde_yaml::from_str::<ClashProxy>(s) {
                    proxies.push(p);
                }
            }
            Value::Object(_) => {
                if let Ok(p) = serde_json::from_value::<ClashProxy>(item.clone()) {
                    proxies.push(p);
                }
            }
            _ => {}
        }
    }

    // 2. Get subscribe items
    #[derive(serde::Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct SubscribeItem {
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

    let items: Vec<SubscribeItem> = if let Some(ref si) = sub.subscribe_items {
        serde_json::from_value(si.clone()).unwrap_or_default()
    } else if let Some(ref url) = sub.subscribe_url {
        parse_subscribe_url(url)
            .into_iter()
            .map(|u| SubscribeItem {
                url: u,
                prefix: String::new(),
                enabled: Some(true),
                cache_ttl_minutes: None,
                fetch_ua: None,
            })
            .collect()
    } else {
        Vec::new()
    };

    // 3. Get filter
    let default_filter: Vec<String> = parse_jsonc(DEFAULT_FILTER_JSON, Vec::new());
    let filter: Vec<String> = if sub.use_system_filter {
        default_filter
    } else {
        safe_parse_jsonc(sub.filter.as_deref(), Vec::new())
    };

    // Determine types to exclude
    let exclude_types: Vec<&str> = match format {
        "sing-box" | "sing-box-windows" => vec!["ssr", "anytls"],
        _ => vec!["ssr"],
    };

    // 4. Fetch each enabled item
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .unwrap_or_default();

    for item in &items {
        if item.enabled == Some(false) {
            continue;
        }

        let cache_ttl = item
            .cache_ttl_minutes
            .or(sub.cache_ttl_minutes)
            .unwrap_or(60);
        let ua = resolve_ua(item.fetch_ua.as_deref());

        let result =
            fetch_subscription::fetch_and_parse(&client, &item.url, &ua, cache_ttl, 3).await;
        let mut parsed = if let Some(r) = result {
            r.proxies
        } else {
            warn!(
                "Subscription source returned 0 nodes after retries: {}",
                item.url
            );
            continue;
        };

        // Prepend prefix (normalized)
        let normalized_prefix = normalize_prefix(&item.prefix);
        if !normalized_prefix.is_empty() {
            for p in &mut parsed {
                p.name = format!("{}{}", normalized_prefix, p.name);
            }
        }

        // Apply filter
        let filtered: Vec<ClashProxy> = parsed
            .into_iter()
            .filter(|p| !filter.iter().any(|f| p.name.contains(f)))
            .filter(|p| !exclude_types.contains(&p.proxy_type.as_str()))
            .collect();

        proxies.extend(filtered);
    }

    // 5. Apply icon to all node names
    for p in &mut proxies {
        p.name = append_icon(&p.name);
    }

    Ok(proxies)
}

// ─── Build Clash config ───

/// Build a complete Clash or Clash-Meta YAML config string.
pub fn build_clash_config(
    sub: &proxy_subscribes::Model,
    proxies: &[ClashProxy],
    is_meta: bool,
) -> String {
    let dns = resolve_dns_config(sub.use_system_dns_config, sub.dns_config.as_deref());
    let node_names: Vec<&str> = proxies.iter().map(|p| p.name.as_str()).collect();

    // Rule providers
    let default_rp: Map<String, Value> = parse_jsonc(DEFAULT_RULE_PROVIDERS_JSON, Map::new());
    let rule_providers_list: Map<String, Value> = if sub.use_system_rule_list {
        default_rp.clone()
    } else {
        let custom: Map<String, Value> = safe_parse_jsonc(sub.rule_list.as_deref(), Map::new());
        if custom.is_empty() {
            default_rp.clone()
        } else {
            custom
        }
    };

    let mut rule_set: Vec<String> = Vec::new();
    let mut rule_providers = Map::new();
    for (group_name, items) in &rule_providers_list {
        if let Some(arr) = items.as_array() {
            for item in arr {
                let name = item.get("name").and_then(|v| v.as_str()).unwrap_or("");
                let url = item.get("url").and_then(|v| v.as_str()).unwrap_or("");
                let behavior = item
                    .get("type")
                    .and_then(|v| v.as_str())
                    .unwrap_or("classical");
                rule_set.push(format!("RULE-SET,{name},{group_name}"));
                rule_providers.insert(
                    name.to_string(),
                    json!({
                        "type": "http",
                        "behavior": behavior,
                        "url": url,
                        "path": format!("./rules/{}", name),
                        "interval": 86400
                    }),
                );
            }
        }
    }

    // Groups
    let default_groups: Vec<Value> = parse_jsonc(DEFAULT_GROUPS_JSON, Vec::new());
    let groups: Vec<Value> = if sub.use_system_group {
        default_groups.clone()
    } else {
        let custom: Vec<Value> = safe_parse_jsonc(sub.group.as_deref(), Vec::new());
        if custom.is_empty() {
            default_groups.clone()
        } else {
            custom
        }
    };

    let proxy_groups: Vec<Value> = groups
        .iter()
        .map(|g| {
            let name = g.get("name").and_then(|v| v.as_str()).unwrap_or("");
            let gtype = g.get("type").and_then(|v| v.as_str()).unwrap_or("select");
            let base_proxies: Vec<Value> = g
                .get("proxies")
                .and_then(|v| v.as_array())
                .cloned()
                .unwrap_or_default();
            let readonly = g
                .get("readonly")
                .and_then(sea_orm::JsonValue::as_bool)
                .unwrap_or(false);

            let mut all_proxies = base_proxies.clone();
            if !readonly {
                for n in &node_names {
                    all_proxies.push(json!(n));
                }
            }

            json!({
                "name": name,
                "type": gtype,
                "proxies": all_proxies,
            })
        })
        .collect();

    // Custom config rules
    let default_custom: Vec<String> = parse_jsonc(DEFAULT_CUSTOM_CONFIG_JSON, Vec::new());
    let custom_config: Vec<String> = if sub.use_system_custom_config {
        default_custom
    } else {
        safe_parse_jsonc(sub.custom_config.as_deref(), Vec::new())
    };

    let mut rules: Vec<String> = Vec::new();
    for item in &custom_config {
        rules.push(item.clone());
    }
    rules.extend(rule_set);
    rules.push("DOMAIN-SUFFIX,local,DIRECT".into());
    rules.push("GEOIP,LAN,DIRECT,no-resolve".into());
    rules.push("GEOIP,CN,DIRECT,no-resolve".into());
    rules.push("MATCH,⚓️ 其他流量".into());

    // Serialize proxies as Value array
    let proxies_value: Vec<Value> = proxies
        .iter()
        .filter_map(|p| serde_json::to_value(p).ok())
        .collect();

    // Build the main config
    let mut data = Map::new();
    data.insert("tproxy-port".into(), json!(dns.shared.tproxy_port));
    data.insert("allow-lan".into(), json!(true));
    data.insert("mode".into(), json!("Rule"));
    data.insert("log-level".into(), json!("info"));
    data.insert("secret".into(), json!(dns.shared.clash_api_secret));

    if is_meta {
        data.insert("unified-delay".into(), json!(true));
        data.insert("tcp-concurrent".into(), json!(true));
        data.insert("find-process-mode".into(), json!("strict"));
        data.insert("global-client-fingerprint".into(), json!("chrome"));
        data.insert("geodata-mode".into(), json!(true));
        data.insert("geo-auto-update".into(), json!(true));
        data.insert("geo-update-interval".into(), json!(24));
        data.insert(
            "sniffer".into(),
            json!({
                "enable": true,
                "force-dns-mapping": true,
                "parse-pure-ip": true,
                "override-destination": true,
                "sniff": {
                    "HTTP": {"ports": [80, "8080-8880"], "override-destination": true},
                    "TLS": {"ports": [443, 8443]},
                    "QUIC": {"ports": [443, 8443]}
                }
            }),
        );
    }

    data.insert("proxies".into(), json!(proxies_value));
    data.insert("proxy-groups".into(), json!(proxy_groups));
    data.insert("rule-providers".into(), Value::Object(rule_providers));
    data.insert("rules".into(), json!(rules));
    data.insert(
        "profile".into(),
        json!({"store-selected": true, "store-fake-ip": true, "tracing": true}),
    );

    // DNS override
    let dns_key = if is_meta { "clashMeta" } else { "clash" };
    if let Some(dns_override) = dns.overrides.get(dns_key) {
        data.insert("dns".into(), dns_override.clone());
    } else if is_meta {
        // For clashMeta, fall back to "clash" override
        if let Some(dns_override) = dns.overrides.get("clash") {
            data.insert("dns".into(), dns_override.clone());
        }
    }

    let yaml_body = serde_yaml::to_string(&Value::Object(data)).unwrap_or_default();
    format!(
        "\n#---------------------------------------------------#\n## Update: {}\n#---------------------------------------------------#\n{}",
        chrono::Utc::now().to_rfc3339(),
        yaml_body
    )
}

// ─── Build Sing-box config ───

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SingboxVersion {
    V11,
    V12,
    V13,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SingboxPlatform {
    DefaultTproxy,
    WindowsTun,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct SingboxTarget {
    pub version: SingboxVersion,
    pub platform: SingboxPlatform,
}

impl SingboxTarget {
    pub const fn default_v11() -> Self {
        Self {
            version: SingboxVersion::V11,
            platform: SingboxPlatform::DefaultTproxy,
        }
    }

    pub const fn default_v12() -> Self {
        Self {
            version: SingboxVersion::V12,
            platform: SingboxPlatform::DefaultTproxy,
        }
    }

    pub const fn default_v13() -> Self {
        Self {
            version: SingboxVersion::V13,
            platform: SingboxPlatform::DefaultTproxy,
        }
    }

    pub const fn windows_v11() -> Self {
        Self {
            version: SingboxVersion::V11,
            platform: SingboxPlatform::WindowsTun,
        }
    }

    pub const fn windows_v12() -> Self {
        Self {
            version: SingboxVersion::V12,
            platform: SingboxPlatform::WindowsTun,
        }
    }

    pub const fn windows_v13() -> Self {
        Self {
            version: SingboxVersion::V13,
            platform: SingboxPlatform::WindowsTun,
        }
    }

    pub fn from_format(format: &str) -> Option<Self> {
        match format {
            "sing-box" => Some(Self::default_v11()),
            "sing-box-windows" => Some(Self::windows_v11()),
            "sing-box-v12" => Some(Self::default_v12()),
            "sing-box-v12-windows" => Some(Self::windows_v12()),
            "sing-box-v13" => Some(Self::default_v13()),
            "sing-box-v13-windows" => Some(Self::windows_v13()),
            _ => None,
        }
    }

    pub const fn uses_modern_dns(self) -> bool {
        matches!(self.version, SingboxVersion::V12 | SingboxVersion::V13)
    }

    pub const fn rule_set_version(self) -> u8 {
        match self.version {
            SingboxVersion::V11 => 1,
            SingboxVersion::V12 => 3,
            SingboxVersion::V13 => 4,
        }
    }

    pub const fn is_windows(self) -> bool {
        matches!(self.platform, SingboxPlatform::WindowsTun)
    }

    pub const fn format(self) -> &'static str {
        match (self.version, self.platform) {
            (SingboxVersion::V11, SingboxPlatform::DefaultTproxy) => "sing-box",
            (SingboxVersion::V11, SingboxPlatform::WindowsTun) => "sing-box-windows",
            (SingboxVersion::V12, SingboxPlatform::DefaultTproxy) => "sing-box-v12",
            (SingboxVersion::V12, SingboxPlatform::WindowsTun) => "sing-box-v12-windows",
            (SingboxVersion::V13, SingboxPlatform::DefaultTproxy) => "sing-box-v13",
            (SingboxVersion::V13, SingboxPlatform::WindowsTun) => "sing-box-v13-windows",
        }
    }
}

/// Build a complete Sing-box JSON config.
#[allow(clippy::too_many_lines)]
pub fn build_singbox_config(
    sub: &proxy_subscribes::Model,
    proxies: &[ClashProxy],
    target: SingboxTarget,
    public_server_url: &str,
) -> Value {
    let dns = resolve_dns_config(sub.use_system_dns_config, sub.dns_config.as_deref());
    let private_access = resolve_private_access_config(sub, target);
    let node_names: Vec<&str> = proxies.iter().map(|p| p.name.as_str()).collect();
    let uses_modern_dns = target.uses_modern_dns();
    let rule_set_version = target.rule_set_version();

    // Convert proxies to sing-box outbounds
    let mut outbounds: Vec<Value> = Vec::new();
    outbounds.push(json!({"type": "direct", "tag": "🚀 直接连接"}));
    if !uses_modern_dns {
        outbounds.push(json!({"tag": "dns-out", "type": "dns"}));
    }
    outbounds.push(json!({"type": "block", "tag": "reject"}));

    for p in proxies {
        if let Some(mut ob) = convert_clash_proxy_to_singbox(p) {
            if target.is_windows() && uses_modern_dns && is_domain_name(&p.server) {
                ob["domain_resolver"] = json!({
                    "server": "bootstrap",
                    "strategy": "ipv4_only"
                });
            }
            outbounds.push(ob);
        }
    }
    outbounds.extend(private_access_outbounds(&private_access));

    // Groups
    let singbox_keyword_map = |p: &str| -> String {
        match p {
            "REJECT" => "reject".into(),
            "DIRECT" => "🚀 直接连接".into(),
            _ => p.to_string(),
        }
    };

    let builtin_tags: Vec<&str> = vec!["🚀 直接连接", "reject", "dns-out"];

    let default_groups: Vec<Value> = parse_jsonc(DEFAULT_GROUPS_JSON, Vec::new());
    let raw_groups: Vec<Value> = if sub.use_system_group {
        default_groups.clone()
    } else {
        let custom: Vec<Value> = safe_parse_jsonc(sub.group.as_deref(), Vec::new());
        if custom.is_empty() {
            default_groups.clone()
        } else {
            custom
        }
    };

    // For singbox, filter out builtin tag groups and map keywords
    let groups: Vec<Value> = raw_groups
        .iter()
        .filter(|g| {
            let name = g.get("name").and_then(|v| v.as_str()).unwrap_or("");
            !builtin_tags.contains(&name)
        })
        .map(|g| {
            let mut g = g.clone();
            if let Some(proxies_arr) = g.get("proxies").and_then(|v| v.as_array()) {
                let mapped: Vec<Value> = proxies_arr
                    .iter()
                    .map(|p| {
                        let s = p.as_str().unwrap_or("");
                        json!(singbox_keyword_map(s))
                    })
                    .collect();
                g.as_object_mut()
                    .unwrap()
                    .insert("proxies".into(), json!(mapped));
            }
            g
        })
        .collect();

    // Build selector outbounds
    for g in &groups {
        let name = g.get("name").and_then(|v| v.as_str()).unwrap_or("");
        let readonly = g
            .get("readonly")
            .and_then(sea_orm::JsonValue::as_bool)
            .unwrap_or(false);
        let base_proxies: Vec<String> = g
            .get("proxies")
            .and_then(|v| v.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(|v| v.as_str().map(String::from))
                    .collect()
            })
            .unwrap_or_default();

        let mut all_outbounds: Vec<String> = Vec::new();
        let windows_foreign_selector = target.is_windows() && name == "🔰 国外流量";
        if windows_foreign_selector && !readonly {
            for n in &node_names {
                push_unique(&mut all_outbounds, (*n).to_string());
            }
            for p in &base_proxies {
                push_unique(&mut all_outbounds, p.clone());
            }
        } else {
            for p in &base_proxies {
                push_unique(&mut all_outbounds, p.clone());
            }
            if !readonly {
                for n in &node_names {
                    push_unique(&mut all_outbounds, (*n).to_string());
                }
            }
        }

        let default_ob = all_outbounds.first().cloned().unwrap_or_default();
        let mut selector = json!({
            "type": "selector",
            "tag": name,
            "outbounds": all_outbounds,
            "interrupt_exist_connections": true,
        });
        if !windows_foreign_selector {
            selector["default"] = json!(default_ob);
        }
        outbounds.push(selector);
    }

    // Rule providers list
    let default_rp: Map<String, Value> = parse_jsonc(DEFAULT_RULE_PROVIDERS_JSON, Map::new());
    let rule_providers_list: Map<String, Value> = if sub.use_system_rule_list {
        default_rp.clone()
    } else {
        let custom: Map<String, Value> = safe_parse_jsonc(sub.rule_list.as_deref(), Map::new());
        if custom.is_empty() {
            default_rp.clone()
        } else {
            custom
        }
    };

    let convert_rule_base = match rule_set_version {
        3 => format!("{public_server_url}/api/proxy/sing-box/convert/rule/12"),
        4 => format!("{public_server_url}/api/proxy/sing-box/convert/rule/13"),
        _ => format!("{public_server_url}/api/proxy/sing-box/convert/rule"),
    };

    let mut rule_set_entries: Vec<Value> = Vec::new();
    for (_group_name, items) in &rule_providers_list {
        if let Some(arr) = items.as_array() {
            for item in arr {
                let name = item.get("name").and_then(|v| v.as_str()).unwrap_or("");
                let url = item.get("url").and_then(|v| v.as_str()).unwrap_or("");
                rule_set_entries.push(json!({
                    "type": "remote",
                    "url": format!("{}?url={}", convert_rule_base, urlencoding::encode(url)),
                    "tag": name,
                    "format": "source",
                    "download_detour": "🚀 直接连接",
                }));
            }
        }
    }

    let mut server_domains: Vec<Value> = proxies
        .iter()
        .filter(|p| is_domain_name(&p.server))
        .map(|p| json!(p.server))
        .collect();
    server_domains.extend(private_access_direct_domains(&private_access));

    // DNS section
    let mut dns_section = if target.is_windows() {
        build_windows_singbox_dns(&dns, uses_modern_dns, &server_domains)
    } else {
        build_singbox_dns(&dns, uses_modern_dns)
    };
    if let Some(private_access) = private_access.as_ref() {
        apply_private_access_dns(&mut dns_section, private_access);
    }

    // Inbounds
    let inbounds = if target.is_windows() {
        json!([
            {
                "type": "tun",
                "tag": "tun-in",
                "interface_name": "sing-box",
                "address": ["172.19.0.1/30"],
                "auto_route": true,
                "strict_route": true,
                "stack": "mixed",
            }
        ])
    } else if uses_modern_dns {
        json!([
            {
                "type": "direct",
                "tag": "dns-in",
                "listen": "::",
                "listen_port": dns.shared.dns_listen_port,
            },
            {
                "type": "tproxy",
                "listen": "::",
                "listen_port": dns.shared.tproxy_port,
                "tcp_multi_path": false,
                "tcp_fast_open": true,
                "udp_fragment": true,
            }
        ])
    } else {
        json!([
            {
                "type": "direct",
                "tag": "dns-in",
                "listen": "::",
                "sniff": true,
                "listen_port": dns.shared.dns_listen_port,
            },
            {
                "type": "tproxy",
                "listen": "::",
                "listen_port": dns.shared.tproxy_port,
                "tcp_multi_path": false,
                "tcp_fast_open": true,
                "udp_fragment": true,
                "sniff": true,
                "sniff_override_destination": false,
            }
        ])
    };

    // Route rules
    let mut route_rules = if target.is_windows() && uses_modern_dns {
        let mut rules = vec![
            json!({"action": "sniff"}),
            json!({"protocol": "dns", "action": "hijack-dns"}),
        ];
        if !server_domains.is_empty() {
            rules.push(json!({
                "domain": server_domains,
                "outbound": "🚀 直接连接"
            }));
        }
        rules.push(json!({
            "action": "route",
            "outbound": "🚀 直接连接",
            "rule_set": ["geoip-cn", "geosite-cn"],
            "ip_is_private": true
        }));
        Value::Array(rules)
    } else if target.is_windows() {
        let mut rules = vec![json!({"outbound": "dns-out", "protocol": "dns"})];
        if !server_domains.is_empty() {
            rules.push(json!({
                "domain": server_domains,
                "outbound": "🚀 直接连接"
            }));
        }
        rules.push(json!({
            "outbound": "🚀 直接连接",
            "rule_set": ["geoip-cn", "geosite-cn"],
            "ip_is_private": true
        }));
        Value::Array(rules)
    } else if uses_modern_dns {
        json!([
            {"inbound": "dns-in", "action": "hijack-dns"},
            {"action": "sniff"},
            {
                "action": "route",
                "outbound": "🚀 直接连接",
                "rule_set": ["geoip-cn", "geosite-cn"],
                "ip_is_private": true
            }
        ])
    } else {
        json!([
            {"outbound": "dns-out", "inbound": ["dns-in"], "protocol": "dns"},
            {
                "outbound": "🚀 直接连接",
                "rule_set": ["geoip-cn", "geosite-cn"],
                "ip_is_private": true
            }
        ])
    };
    if let Some(private_access) = private_access.as_ref() {
        apply_private_access_routes(&mut route_rules, private_access);
    }

    // Geo rule sets
    let gfwblack_url = match rule_set_version {
        3 => format!(
            "{}/api/proxy/sing-box/convert/rule/12?url={}",
            public_server_url,
            urlencoding::encode("https://cdn.jsdelivr.net/gh/ohmywrt/clash-rule@master/gfwip.yaml")
        ),
        4 => format!(
            "{}/api/proxy/sing-box/convert/rule/13?url={}",
            public_server_url,
            urlencoding::encode("https://cdn.jsdelivr.net/gh/ohmywrt/clash-rule@master/gfwip.yaml")
        ),
        _ => format!(
            "{}/api/proxy/sing-box/convert/rule?url={}",
            public_server_url,
            urlencoding::encode("https://cdn.jsdelivr.net/gh/ohmywrt/clash-rule@master/gfwip.yaml")
        ),
    };

    let mut all_rule_sets = rule_set_entries;
    all_rule_sets.extend(vec![
        json!({
            "tag": "geoip-cn",
            "type": "remote",
            "format": "binary",
            "url": "https://cdn.jsdelivr.net/gh/SagerNet/sing-geoip@rule-set/geoip-cn.srs",
            "download_detour": "🚀 直接连接"
        }),
        json!({
            "tag": "geoip-hk",
            "type": "remote",
            "format": "binary",
            "url": "https://cdn.jsdelivr.net/gh/SagerNet/sing-geoip@rule-set/geoip-hk.srs",
            "download_detour": "🚀 直接连接"
        }),
        json!({
            "tag": "geosite-openai",
            "type": "remote",
            "format": "binary",
            "url": "https://cdn.jsdelivr.net/gh/SagerNet/sing-geosite@rule-set/geosite-openai.srs",
            "download_detour": "🚀 直接连接"
        }),
        json!({
            "tag": "geosite-cn",
            "type": "remote",
            "format": "binary",
            "url": "https://cdn.jsdelivr.net/gh/SagerNet/sing-geosite@rule-set/geosite-cn.srs",
            "download_detour": "🚀 直接连接"
        }),
        json!({
            "tag": "geoip-gfwblack",
            "type": "remote",
            "url": gfwblack_url,
            "format": "source",
            "download_detour": "🚀 直接连接"
        }),
    ]);

    let mut route = json!({
        "rules": route_rules,
        "rule_set": all_rule_sets,
        "final": "⚓️ 其他流量",
    });
    if uses_modern_dns {
        route["default_domain_resolver"] = json!(if target.is_windows() {
            "bootstrap"
        } else {
            "local"
        });
    }
    if target.is_windows() {
        route["auto_detect_interface"] = json!(true);
    }

    let store_fakeip = dns.shared.fakeip_enabled && !target.is_windows();
    let clash_api_ui_path = if target.is_windows() {
        "./ui".to_string()
    } else {
        dns.shared.clash_api_ui_path.clone()
    };

    let mut config = json!({
        "log": {"disabled": false, "level": "info", "timestamp": true},
        "dns": dns_section,
        "inbounds": inbounds,
        "outbounds": outbounds,
        "route": route,
        "experimental": {
            "cache_file": {
                "enabled": true,
                "store_fakeip": store_fakeip,
                "store_rdrc": false
            },
            "clash_api": {
                "external_controller": format!("{}:{}", if target.is_windows() { "127.0.0.1" } else { "0.0.0.0" }, dns.shared.clash_api_port),
                "external_ui": clash_api_ui_path,
                "external_ui_download_url": "https://gh-proxy.org/https://github.com/MetaCubeX/metacubexd/archive/refs/heads/gh-pages.zip",
                "secret": dns.shared.clash_api_secret,
                "default_mode": "rule"
            }
        }
    });
    let endpoints = private_access_endpoints(&private_access);
    if !endpoints.is_empty() {
        config["endpoints"] = json!(endpoints);
    }

    // Add custom rules and rule_set rules to route
    let default_custom: Vec<Value> = parse_jsonc(DEFAULT_CUSTOM_CONFIG_JSON, Vec::new());
    let custom_config: Vec<Value> = if sub.use_system_custom_config {
        default_custom
    } else {
        safe_parse_jsonc(sub.custom_config.as_deref(), Vec::new())
    };

    if let Some(route_obj) = config.get_mut("route").and_then(|r| r.as_object_mut())
        && let Some(rules_arr) = route_obj.get_mut("rules").and_then(|r| r.as_array_mut())
    {
        // Add custom rules
        for item in &custom_config {
            if let Value::String(s) = item {
                let parts: Vec<&str> = s.split(',').collect();
                if parts.len() >= 3 {
                    let mut rule = Map::new();
                    match parts[0] {
                        "DOMAIN" => {
                            rule.insert("domain".into(), json!(parts[1]));
                        }
                        "DOMAIN-SUFFIX" => {
                            rule.insert("domain_suffix".into(), json!(parts[1]));
                        }
                        "DOMAIN-KEYWORD" => {
                            rule.insert("domain_keyword".into(), json!(parts[1]));
                        }
                        "DOMAIN-REGEX" => {
                            rule.insert("domain_regex".into(), json!(parts[1]));
                        }
                        "IP-CIDR" => {
                            rule.insert("ip_cidr".into(), json!(parts[1]));
                        }
                        "SRC-IP-CIDR" => {
                            rule.insert("source_ip_cidr".into(), json!(parts[1]));
                        }
                        _ => continue,
                    }
                    rule.insert("outbound".into(), json!(parts[2]));
                    rules_arr.push(Value::Object(rule));
                }
            } else if item.is_object() {
                rules_arr.push(item.clone());
            }
        }

        // Add rule-set routing rules
        for (group_name, items) in &rule_providers_list {
            if let Some(arr) = items.as_array() {
                let tags: Vec<Value> = arr
                    .iter()
                    .filter_map(|item| item.get("name").and_then(|v| v.as_str()).map(|s| json!(s)))
                    .collect();
                if !tags.is_empty() {
                    rules_arr.push(json!({
                        "outbound": group_name,
                        "rule_set": tags,
                    }));
                }
            }
        }
    }

    config
}

fn is_domain_name(host: &str) -> bool {
    !host.is_empty() && host.parse::<IpAddr>().is_err()
}

fn push_unique(items: &mut Vec<String>, item: String) {
    if !items.iter().any(|existing| existing == &item) {
        items.push(item);
    }
}

fn build_singbox_dns(dns: &ResolvedDns, uses_modern_dns: bool) -> Value {
    let override_key = if uses_modern_dns {
        "singboxV12"
    } else {
        "singbox"
    };
    let fallback_key = if uses_modern_dns { "singbox" } else { "" };

    if let Some(ov) = dns.overrides.get(override_key) {
        return ov.clone();
    }
    if !fallback_key.is_empty()
        && let Some(ov) = dns.overrides.get(fallback_key)
    {
        return ov.clone();
    }

    let s = &dns.shared;

    if uses_modern_dns {
        // v1.12 DNS format
        let mut servers = vec![json!({"type": "local", "tag": "local"})];
        if s.fakeip_enabled {
            servers.push(json!({
                "type": "fakeip",
                "tag": "fakeip",
                "inet4_range": s.fakeip_ipv4_range,
                "inet6_range": s.fakeip_ipv6_range,
            }));
        }
        servers.push(json!({
            "type": "udp",
            "tag": "local_v4",
            "server": s.local_dns,
            "server_port": s.local_dns_port,
        }));

        let mut rules: Vec<Value> = Vec::new();
        if s.reject_https {
            rules.push(json!({"query_type": ["HTTPS"], "action": "reject"}));
        }
        rules.push(json!({
            "ip_cidr": ["127.0.0.0/8", "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"],
            "action": "route",
            "server": "local"
        }));
        if s.cn_domain_local_dns {
            rules.push(json!({"rule_set": ["geosite-cn"], "action": "route", "server": "local"}));
            rules.push(json!({
                "type": "logical",
                "mode": "and",
                "rules": [
                    {"rule_set": ["geoip-cn"]},
                    {"rule_set": ["geoip-hk"], "invert": true},
                    {"rule_set": ["geoip-gfwblack"], "invert": true}
                ],
                "action": "route",
                "server": "local"
            }));
        }
        if s.fakeip_enabled {
            rules.push(json!({
                "disable_cache": false,
                "rewrite_ttl": s.fakeip_ttl,
                "query_type": ["A", "AAAA"],
                "action": "route",
                "server": "fakeip"
            }));
        }

        json!({
            "servers": servers,
            "rules": rules,
            "independent_cache": false,
        })
    } else {
        // v1.11 DNS format
        let mut servers =
            vec![json!({"tag": "local", "address": s.local_dns, "detour": "🚀 直接连接"})];
        if s.fakeip_enabled {
            servers.push(json!({"tag": "fakeip", "address": "fakeip", "strategy": "ipv4_only"}));
        }
        servers.push(json!({
            "tag": "local_v4",
            "address": s.local_dns,
            "strategy": "ipv4_only",
            "detour": "🚀 直接连接"
        }));

        let mut rules: Vec<Value> = Vec::new();
        if s.reject_https {
            rules.push(json!({"query_type": ["HTTPS"], "action": "reject"}));
        }
        rules.push(json!({
            "ip_cidr": ["127.0.0.0/8", "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"],
            "server": "local"
        }));
        if s.cn_domain_local_dns {
            rules.push(json!({"rule_set": ["geosite-cn"], "server": "local"}));
            rules.push(json!({
                "type": "logical",
                "mode": "and",
                "rules": [
                    {"rule_set": ["geoip-cn"]},
                    {"rule_set": ["geoip-hk"], "invert": true},
                    {"rule_set": ["geoip-gfwblack"], "invert": true}
                ],
                "server": "local"
            }));
        }
        if s.fakeip_enabled {
            rules.push(json!({
                "disable_cache": false,
                "rewrite_ttl": s.fakeip_ttl,
                "query_type": ["A", "AAAA"],
                "server": "fakeip"
            }));
        }

        let mut dns_section = json!({
            "disable_cache": false,
            "servers": servers,
            "rules": rules,
            "disable_expire": false,
            "independent_cache": false,
            "reverse_mapping": false,
        });
        if s.fakeip_enabled {
            dns_section["fakeip"] = json!({
                "enabled": true,
                "inet4_range": s.fakeip_ipv4_range,
                "inet6_range": s.fakeip_ipv6_range,
            });
        }
        dns_section
    }
}

fn build_windows_singbox_dns(
    dns: &ResolvedDns,
    uses_modern_dns: bool,
    server_domains: &[Value],
) -> Value {
    if !uses_modern_dns {
        let s = &dns.shared;
        let mut rules: Vec<Value> = Vec::new();
        if s.reject_https {
            rules.push(json!({"query_type": ["HTTPS"], "action": "reject"}));
        }
        if !server_domains.is_empty() {
            rules.push(json!({"domain": server_domains, "server": "local"}));
        }
        rules.push(json!({
            "ip_cidr": ["127.0.0.0/8", "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"],
            "server": "local"
        }));
        if s.cn_domain_local_dns {
            rules.push(json!({"rule_set": ["geosite-cn"], "server": "local"}));
            rules.push(json!({
                "type": "logical",
                "mode": "and",
                "rules": [
                    {"rule_set": ["geoip-cn"]},
                    {"rule_set": ["geoip-hk"], "invert": true},
                    {"rule_set": ["geoip-gfwblack"], "invert": true}
                ],
                "server": "local"
            }));
        }

        return json!({
            "disable_cache": false,
            "servers": [
                {
                    "tag": "local",
                    "address": "https://223.5.5.5/dns-query",
                    "detour": "🚀 直接连接"
                },
                {
                    "tag": "local_v4",
                    "address": "https://223.5.5.5/dns-query",
                    "strategy": "ipv4_only",
                    "detour": "🚀 直接连接"
                },
                {
                    "tag": "remote",
                    "address": "https://8.8.8.8/dns-query",
                    "detour": "🔰 国外流量"
                }
            ],
            "rules": rules,
            "disable_expire": false,
            "independent_cache": false,
            "reverse_mapping": true,
            "final": "remote",
        });
    }

    let s = &dns.shared;

    let mut rules: Vec<Value> = Vec::new();
    if s.reject_https {
        rules.push(json!({"query_type": ["HTTPS"], "action": "reject"}));
    }
    rules.push(json!({
        "ip_cidr": ["127.0.0.0/8", "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"],
        "action": "route",
        "server": "local"
    }));
    if s.cn_domain_local_dns {
        rules.push(json!({"rule_set": ["geosite-cn"], "action": "route", "server": "local"}));
        rules.push(json!({
            "type": "logical",
            "mode": "and",
            "rules": [
                {"rule_set": ["geoip-cn"]},
                {"rule_set": ["geoip-hk"], "invert": true},
                {"rule_set": ["geoip-gfwblack"], "invert": true}
            ],
            "action": "route",
            "server": "local"
        }));
    }

    json!({
        "servers": [
            {
                "type": "tls",
                "tag": "local",
                "server": "223.5.5.5",
                "server_port": 853,
                "tls": {"server_name": "dns.alidns.com"}
            },
            {
                "type": "tls",
                "tag": "local_v4",
                "server": "223.5.5.5",
                "server_port": 853,
                "tls": {"server_name": "dns.alidns.com"}
            },
            {
                "type": "tls",
                "tag": "bootstrap",
                "server": "223.5.5.5",
                "server_port": 853,
                "tls": {"server_name": "dns.alidns.com"}
            },
            {
                "type": "tls",
                "tag": "remote",
                "server": "8.8.8.8",
                "server_port": 853,
                "tls": {"server_name": "dns.google"},
                "detour": "🔰 国外流量",
            }
        ],
        "rules": rules,
        "independent_cache": false,
        "reverse_mapping": true,
        "final": "remote",
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use std::path::{Path, PathBuf};
    use std::process::Command;

    fn test_subscribe() -> proxy_subscribes::Model {
        proxy_subscribes::Model {
            id: uuid::Uuid::new_v4(),
            user_id: uuid::Uuid::new_v4(),
            url: "test-subscribe".to_string(),
            remark: None,
            subscribe_url: None,
            subscribe_items: None,
            rule_list: None,
            use_system_rule_list: true,
            group: None,
            use_system_group: true,
            filter: None,
            use_system_filter: true,
            servers: None,
            custom_config: None,
            use_system_custom_config: true,
            dns_config: None,
            use_system_dns_config: true,
            private_access_config: None,
            authorized_user_ids: None,
            cache_ttl_minutes: None,
            cached_node_count: None,
            last_access_at: None,
            created_at: None,
            updated_at: None,
        }
    }

    fn inbound_types(config: &Value) -> Vec<&str> {
        config
            .get("inbounds")
            .and_then(Value::as_array)
            .unwrap()
            .iter()
            .filter_map(|inbound| inbound.get("type").and_then(Value::as_str))
            .collect()
    }

    fn domain_vmess_proxy() -> ClashProxy {
        let mut extra = Map::new();
        extra.insert("uuid".into(), json!("00000000-0000-0000-0000-000000000000"));
        extra.insert("cipher".into(), json!("auto"));
        ClashProxy {
            name: "domain node".to_string(),
            proxy_type: "vmess".to_string(),
            server: "node.example.com".to_string(),
            port: 443,
            extra,
        }
    }

    fn singbox_vendor_bin(env_key: &str, vendor_dir: &str) -> Option<PathBuf> {
        if let Ok(bin) = std::env::var(env_key)
            && !bin.is_empty()
        {
            return Some(PathBuf::from(bin));
        }

        let repo_root = Path::new(env!("CARGO_MANIFEST_DIR"))
            .parent()
            .and_then(Path::parent)?;
        let vendor = repo_root
            .join(".data")
            .join("vendors")
            .join(vendor_dir)
            .join("sing-box");
        vendor.is_file().then_some(vendor)
    }

    fn singbox_v11_bin() -> Option<PathBuf> {
        singbox_vendor_bin("SINGBOX_V11_BIN", "sing-box-v11")
    }

    fn singbox_v12_bin() -> Option<PathBuf> {
        singbox_vendor_bin("SINGBOX_V12_BIN", "sing-box-v12")
    }

    fn singbox_v13_bin() -> Option<PathBuf> {
        singbox_vendor_bin("SINGBOX_V13_BIN", "sing-box-v13")
    }

    fn outbound_by_tag<'a>(config: &'a Value, tag: &str) -> &'a Value {
        config
            .get("outbounds")
            .and_then(Value::as_array)
            .unwrap()
            .iter()
            .find(|outbound| outbound.get("tag").and_then(Value::as_str) == Some(tag))
            .unwrap()
    }

    fn private_access_subscribe() -> proxy_subscribes::Model {
        let mut sub = test_subscribe();
        sub.private_access_config = Some(
            r#"{
              "enabled": true,
              "connectors": [
                {
                  "enabled": true,
                  "tag": "wg-lvmcn",
                  "type": "wireguard",
                  "endpoint": {
                    "address": ["10.8.29.23/32"],
                    "privateKey": "wRGa89tcyKhbZt9fGR6atEru0RFbBbSe16SvjSkAQjE=",
                    "peers": [
                      {
                        "address": "ddns.lvmcn.com",
                        "port": 31088,
                        "publicKey": "w2aXEVTOtvOSdclyYMAdNYVzlS2paWdhncNr5HoXBRo=",
                        "preSharedKey": "mV0yytCSc95AhotCiy4wRl0MI/E0CLS06ybRqYS27z4=",
                        "allowedIps": ["10.8.28.0/24", "10.8.29.0/24", "10.254.0.0/24"],
                        "persistentKeepaliveInterval": 25
                      }
                    ]
                  },
                  "routes": {
                    "ipCidrs": ["10.8.28.0/24"]
                  },
                  "dns": [
                    {
                      "tag": "rpsh-dns",
                      "domainSuffixes": ["rpsh.vmins.com"],
                      "server": "10.8.28.1",
                      "serverPort": 53
                    }
                  ]
                },
                {
                  "enabled": true,
                  "tag": "corp-vmess",
                  "type": "outbound",
                  "outbound": {
                    "type": "vmess",
                    "server": "private.example.com",
                    "serverPort": 443,
                    "uuid": "00000000-0000-0000-0000-000000000000",
                    "security": "auto",
                    "alterId": 0
                  },
                  "routes": {
                    "domainSuffixes": ["corp.example.com"]
                  }
                }
              ]
            }"#
            .to_string(),
        );
        sub
    }

    #[test]
    fn windows_targets_use_tun_without_tproxy() {
        let sub = test_subscribe();
        for target in [
            SingboxTarget::windows_v11(),
            SingboxTarget::windows_v12(),
            SingboxTarget::windows_v13(),
        ] {
            let config = build_singbox_config(&sub, &[], target, "https://example.test");
            let types = inbound_types(&config);
            assert_eq!(types, vec!["tun"]);
            assert_eq!(
                config
                    .pointer("/inbounds/0/interface_name")
                    .and_then(Value::as_str),
                Some("sing-box")
            );
            assert_eq!(
                config
                    .pointer("/route/auto_detect_interface")
                    .and_then(Value::as_bool),
                Some(true)
            );
            assert!(!types.contains(&"tproxy"));
        }
    }

    #[test]
    fn default_targets_keep_tproxy_inbound() {
        let sub = test_subscribe();
        for target in [
            SingboxTarget::default_v11(),
            SingboxTarget::default_v12(),
            SingboxTarget::default_v13(),
        ] {
            let config = build_singbox_config(&sub, &[], target, "https://example.test");
            let types = inbound_types(&config);
            assert!(types.contains(&"tproxy"));
        }
    }

    #[test]
    fn v12_windows_uses_v12_rule_conversion_endpoint() {
        let sub = test_subscribe();
        let config = build_singbox_config(
            &sub,
            &[],
            SingboxTarget::windows_v12(),
            "https://example.test",
        );
        let rule_sets = config
            .pointer("/route/rule_set")
            .and_then(Value::as_array)
            .unwrap();

        assert!(rule_sets.iter().any(|rule_set| {
            rule_set
                .get("url")
                .and_then(Value::as_str)
                .is_some_and(|url| url.contains("/api/proxy/sing-box/convert/rule/12"))
        }));
    }

    #[test]
    fn v13_uses_v13_rule_conversion_endpoint() {
        let sub = test_subscribe();
        for target in [SingboxTarget::default_v13(), SingboxTarget::windows_v13()] {
            let config = build_singbox_config(&sub, &[], target, "https://example.test");
            let rule_sets = config
                .pointer("/route/rule_set")
                .and_then(Value::as_array)
                .unwrap();

            assert_eq!(target.rule_set_version(), 4);
            assert!(rule_sets.iter().any(|rule_set| {
                rule_set
                    .get("url")
                    .and_then(Value::as_str)
                    .is_some_and(|url| url.contains("/api/proxy/sing-box/convert/rule/13"))
            }));
        }
    }

    #[test]
    fn v13_uses_modern_dns_without_dns_outbound() {
        let sub = test_subscribe();
        let config = build_singbox_config(
            &sub,
            &[],
            SingboxTarget::default_v13(),
            "https://example.test",
        );
        let outbound_tags: Vec<&str> = config
            .get("outbounds")
            .and_then(Value::as_array)
            .unwrap()
            .iter()
            .filter_map(|outbound| outbound.get("tag").and_then(Value::as_str))
            .collect();

        assert!(!outbound_tags.contains(&"dns-out"));
        assert_eq!(
            config
                .pointer("/route/default_domain_resolver")
                .and_then(Value::as_str),
            Some("local")
        );
        assert_eq!(
            config
                .pointer("/dns/servers/0/type")
                .and_then(Value::as_str),
            Some("local")
        );
    }

    #[test]
    fn windows_targets_use_windows_dns_and_ui_defaults() {
        let sub = test_subscribe();
        let config = build_singbox_config(
            &sub,
            &[domain_vmess_proxy()],
            SingboxTarget::windows_v13(),
            "https://example.test",
        );

        assert_eq!(
            config
                .pointer("/dns/servers/0/type")
                .and_then(Value::as_str),
            Some("tls")
        );
        assert_eq!(
            config
                .pointer("/dns/servers/0/server")
                .and_then(Value::as_str),
            Some("223.5.5.5")
        );
        assert_eq!(
            config
                .pointer("/dns/servers/0/server_port")
                .and_then(Value::as_u64),
            Some(853)
        );
        assert_eq!(
            config
                .pointer("/dns/servers/0/detour")
                .and_then(Value::as_str),
            None
        );
        assert_eq!(
            config.pointer("/dns/servers/2/tag").and_then(Value::as_str),
            Some("bootstrap")
        );
        assert_eq!(
            config
                .pointer("/dns/servers/3/detour")
                .and_then(Value::as_str),
            Some("🔰 国外流量")
        );
        assert_eq!(
            config
                .pointer("/route/default_domain_resolver")
                .and_then(Value::as_str),
            Some("bootstrap")
        );
        assert_eq!(
            config.pointer("/dns/final").and_then(Value::as_str),
            Some("remote")
        );
        assert_eq!(
            config
                .pointer("/dns/reverse_mapping")
                .and_then(Value::as_bool),
            Some(true)
        );
        assert_eq!(
            config
                .pointer("/experimental/cache_file/store_fakeip")
                .and_then(Value::as_bool),
            Some(false)
        );
        assert_eq!(
            config
                .pointer("/experimental/clash_api/external_ui")
                .and_then(Value::as_str),
            Some("./ui")
        );
        assert_eq!(
            config
                .pointer("/experimental/clash_api/external_controller")
                .and_then(Value::as_str),
            Some("127.0.0.1:9999")
        );
    }

    #[test]
    fn windows_targets_resolve_and_route_proxy_server_domains_directly() {
        let sub = test_subscribe();
        let config = build_singbox_config(
            &sub,
            &[domain_vmess_proxy()],
            SingboxTarget::windows_v13(),
            "https://example.test",
        );

        let node = config
            .get("outbounds")
            .and_then(Value::as_array)
            .unwrap()
            .iter()
            .find(|outbound| outbound.get("tag").and_then(Value::as_str) == Some("domain node"))
            .unwrap();
        assert_eq!(
            node.pointer("/domain_resolver/server")
                .and_then(Value::as_str),
            Some("bootstrap")
        );
        assert_eq!(
            node.pointer("/domain_resolver/strategy")
                .and_then(Value::as_str),
            Some("ipv4_only")
        );

        let rules = config
            .pointer("/route/rules")
            .and_then(Value::as_array)
            .unwrap();
        assert!(rules.iter().any(|rule| {
            rule.get("domain")
                .and_then(Value::as_array)
                .is_some_and(|domains| {
                    domains
                        .iter()
                        .any(|d| d.as_str() == Some("node.example.com"))
                })
                && rule.get("outbound").and_then(Value::as_str) == Some("🚀 直接连接")
        }));
    }

    #[test]
    fn windows_foreign_selector_prefers_nodes_without_dynamic_default() {
        let sub = test_subscribe();
        let config = build_singbox_config(
            &sub,
            &[domain_vmess_proxy()],
            SingboxTarget::windows_v13(),
            "https://example.test",
        );
        let selector = outbound_by_tag(&config, "🔰 国外流量");
        let outbounds = selector.get("outbounds").and_then(Value::as_array).unwrap();

        assert_eq!(
            outbounds.first().and_then(Value::as_str),
            Some("domain node")
        );
        assert!(
            outbounds
                .iter()
                .any(|outbound| outbound.as_str() == Some("🚀 直接连接"))
        );
        assert!(selector.get("default").is_none());
    }

    #[test]
    fn v11_windows_uses_legacy_dns_and_route_schema() {
        let sub = test_subscribe();
        let config = build_singbox_config(
            &sub,
            &[domain_vmess_proxy()],
            SingboxTarget::windows_v11(),
            "https://example.test",
        );
        let node = outbound_by_tag(&config, "domain node");
        assert!(node.get("domain_resolver").is_none());
        assert_eq!(
            config
                .pointer("/dns/servers/0/address")
                .and_then(Value::as_str),
            Some("https://223.5.5.5/dns-query")
        );
        assert_eq!(
            config
                .pointer("/dns/servers/2/detour")
                .and_then(Value::as_str),
            Some("🔰 国外流量")
        );
        assert_eq!(
            config.pointer("/dns/final").and_then(Value::as_str),
            Some("remote")
        );

        let route_rules = config
            .pointer("/route/rules")
            .and_then(Value::as_array)
            .unwrap();
        assert_eq!(
            route_rules
                .first()
                .and_then(|rule| rule.get("protocol"))
                .and_then(Value::as_str),
            Some("dns")
        );
        assert!(route_rules.iter().all(|rule| rule.get("action").is_none()));
        assert!(
            config
                .pointer("/dns/rules")
                .and_then(Value::as_array)
                .unwrap()
                .iter()
                .any(|rule| {
                    rule.get("domain")
                        .and_then(Value::as_array)
                        .is_some_and(|domains| {
                            domains
                                .iter()
                                .any(|domain| domain.as_str() == Some("node.example.com"))
                        })
                        && rule.get("server").and_then(Value::as_str) == Some("local")
                })
        );
    }

    #[test]
    fn v13_windows_injects_private_access_endpoint_outbound_route_and_dns() {
        let config = build_singbox_config(
            &private_access_subscribe(),
            &[domain_vmess_proxy()],
            SingboxTarget::windows_v13(),
            "https://example.test",
        );

        let endpoint = config.pointer("/endpoints/0").unwrap();
        assert_eq!(
            endpoint.get("type").and_then(Value::as_str),
            Some("wireguard")
        );
        assert_eq!(
            endpoint.get("tag").and_then(Value::as_str),
            Some("wg-lvmcn")
        );
        assert_eq!(
            endpoint
                .pointer("/peers/0/persistent_keepalive_interval")
                .and_then(Value::as_u64),
            Some(25)
        );
        assert_eq!(
            endpoint
                .pointer("/domain_resolver/server")
                .and_then(Value::as_str),
            Some("bootstrap")
        );

        let rules = config
            .pointer("/route/rules")
            .and_then(Value::as_array)
            .unwrap();
        assert!(rules.iter().any(|rule| {
            rule.get("domain")
                .and_then(Value::as_array)
                .is_some_and(|domains| {
                    domains
                        .iter()
                        .any(|domain| domain.as_str() == Some("ddns.lvmcn.com"))
                })
                && rule.get("outbound").and_then(Value::as_str) == Some("🚀 直接连接")
        }));
        assert!(rules.iter().any(|rule| {
            rule.get("ip_cidr")
                .and_then(Value::as_array)
                .is_some_and(|cidrs| {
                    cidrs
                        .iter()
                        .any(|cidr| cidr.as_str() == Some("10.8.28.0/24"))
                })
                && rule.get("outbound").and_then(Value::as_str) == Some("wg-lvmcn")
        }));
        assert!(rules.iter().any(|rule| {
            rule.get("domain_suffix")
                .and_then(Value::as_array)
                .is_some_and(|suffixes| {
                    suffixes
                        .iter()
                        .any(|suffix| suffix.as_str() == Some("corp.example.com"))
                })
                && rule.get("outbound").and_then(Value::as_str) == Some("corp-vmess")
        }));

        let outbound = outbound_by_tag(&config, "corp-vmess");
        assert_eq!(outbound.get("type").and_then(Value::as_str), Some("vmess"));
        assert_eq!(
            outbound.get("server_port").and_then(Value::as_u64),
            Some(443)
        );
        assert_eq!(
            outbound
                .pointer("/domain_resolver/server")
                .and_then(Value::as_str),
            Some("bootstrap")
        );

        let servers = config
            .pointer("/dns/servers")
            .and_then(Value::as_array)
            .unwrap();
        assert!(servers.iter().any(|server| {
            server.get("tag").and_then(Value::as_str) == Some("rpsh-dns")
                && server.get("server").and_then(Value::as_str) == Some("10.8.28.1")
                && server.get("detour").and_then(Value::as_str) == Some("wg-lvmcn")
        }));
        assert_eq!(
            config
                .pointer("/dns/rules/0/server")
                .and_then(Value::as_str),
            Some("rpsh-dns")
        );
        assert_eq!(
            config
                .pointer("/dns/rules/0/domain_suffix/0")
                .and_then(Value::as_str),
            Some("rpsh.vmins.com")
        );
    }

    #[test]
    fn v11_ignores_private_access_config() {
        let config = build_singbox_config(
            &private_access_subscribe(),
            &[],
            SingboxTarget::windows_v11(),
            "https://example.test",
        );
        assert!(config.get("endpoints").is_none());
        assert!(
            !config
                .pointer("/route/rules")
                .and_then(Value::as_array)
                .unwrap()
                .iter()
                .any(|rule| rule.get("outbound").and_then(Value::as_str) == Some("wg-lvmcn"))
        );
    }

    fn assert_singbox_check_for_sub(
        bin: &Path,
        target: SingboxTarget,
        sub: &proxy_subscribes::Model,
    ) {
        let config =
            build_singbox_config(sub, &[domain_vmess_proxy()], target, "https://example.test");
        let mut file = tempfile::NamedTempFile::new().unwrap();
        write!(file, "{}", serde_json::to_string_pretty(&config).unwrap()).unwrap();

        let output = Command::new(bin)
            .args(["check", "-c"])
            .arg(file.path())
            .output()
            .unwrap();

        assert!(
            output.status.success(),
            "sing-box check failed for {}:\nstdout:\n{}\nstderr:\n{}",
            target.format(),
            String::from_utf8_lossy(&output.stdout),
            String::from_utf8_lossy(&output.stderr)
        );
    }

    fn assert_singbox_check(bin: &Path, target: SingboxTarget) {
        let sub = test_subscribe();
        assert_singbox_check_for_sub(bin, target, &sub);
    }

    #[test]
    fn generated_configs_pass_singbox_binary_check_when_available() {
        if let Some(bin) = singbox_v11_bin() {
            assert_singbox_check(&bin, SingboxTarget::windows_v11());
        } else {
            eprintln!("skipping sing-box v1.11 binary check: binary not found");
        }

        if let Some(bin) = singbox_v12_bin() {
            assert_singbox_check(&bin, SingboxTarget::windows_v12());
            assert_singbox_check_for_sub(
                &bin,
                SingboxTarget::windows_v12(),
                &private_access_subscribe(),
            );
        } else {
            eprintln!("skipping sing-box v1.12 binary check: binary not found");
        }

        if let Some(bin) = singbox_v13_bin() {
            for target in [SingboxTarget::default_v13(), SingboxTarget::windows_v13()] {
                assert_singbox_check(&bin, target);
            }
            assert_singbox_check_for_sub(
                &bin,
                SingboxTarget::windows_v13(),
                &private_access_subscribe(),
            );
        } else {
            eprintln!("skipping sing-box v1.13 binary check: binary not found");
        }
    }
}
