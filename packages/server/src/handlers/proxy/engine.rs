use serde_json::{json, Map, Value};
use tracing::warn;

use crate::db::entities::proxy_subscribes;

use super::cache;
use super::converter::convert_clash_proxy_to_singbox;
use super::icons::append_icon;
use super::parser::parse_subscription;
use super::types::ClashProxy;
use super::{
    DEFAULT_CUSTOM_CONFIG_JSON, DEFAULT_FILTER_JSON,
    DEFAULT_GROUPS_JSON, DEFAULT_RULE_PROVIDERS_JSON,
};

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

pub(super) fn safe_parse_jsonc<T: serde::de::DeserializeOwned>(jsonc: Option<&str>, default: T) -> T {
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
    if trimmed.starts_with('[') {
        if let Ok(urls) = serde_json::from_str::<Vec<String>>(trimmed) {
            return urls.into_iter().filter(|u| !u.is_empty()).collect();
        }
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
    format!("{}丨", raw)
}

fn dns_shared_from_value(v: &Value) -> DnsShared {
    let d = DnsShared::default();
    let obj = match v.as_object() {
        Some(o) => o,
        None => return d,
    };
    DnsShared {
        local_dns: obj.get("localDns").and_then(|v| v.as_str()).unwrap_or(&d.local_dns).to_string(),
        local_dns_port: obj.get("localDnsPort").and_then(|v| v.as_u64()).unwrap_or(d.local_dns_port),
        fakeip_ipv4_range: obj.get("fakeipIpv4Range").and_then(|v| v.as_str()).unwrap_or(&d.fakeip_ipv4_range).to_string(),
        fakeip_ipv6_range: obj.get("fakeipIpv6Range").and_then(|v| v.as_str()).unwrap_or(&d.fakeip_ipv6_range).to_string(),
        fakeip_enabled: obj.get("fakeipEnabled").and_then(|v| v.as_bool()).unwrap_or(d.fakeip_enabled),
        fakeip_ttl: obj.get("fakeipTtl").and_then(|v| v.as_u64()).unwrap_or(d.fakeip_ttl),
        dns_listen_port: obj.get("dnsListenPort").and_then(|v| v.as_u64()).unwrap_or(d.dns_listen_port),
        tproxy_port: obj.get("tproxyPort").and_then(|v| v.as_u64()).unwrap_or(d.tproxy_port),
        reject_https: obj.get("rejectHttps").and_then(|v| v.as_bool()).unwrap_or(d.reject_https),
        cn_domain_local_dns: obj.get("cnDomainLocalDns").and_then(|v| v.as_bool()).unwrap_or(d.cn_domain_local_dns),
        clash_api_port: obj.get("clashApiPort").and_then(|v| v.as_u64()).unwrap_or(d.clash_api_port),
        clash_api_secret: obj.get("clashApiSecret").and_then(|v| v.as_str()).unwrap_or(&d.clash_api_secret).to_string(),
        clash_api_ui_path: obj.get("clashApiUiPath").and_then(|v| v.as_str()).unwrap_or(&d.clash_api_ui_path).to_string(),
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
    let obj = match parsed.as_object() {
        Some(o) => o,
        None => return defaults,
    };

    let shared_val = obj.get("shared").cloned().unwrap_or(Value::Null);
    let shared = dns_shared_from_value(&shared_val);

    let mut overrides = Map::new();
    if let Some(ov) = obj.get("overrides").and_then(|v| v.as_object()) {
        for key in &["singbox", "singboxV12", "clash", "clashMeta"] {
            if let Some(v) = ov.get(*key) {
                if !v.is_null() {
                    overrides.insert(key.to_string(), v.clone());
                }
            }
        }
    }

    ResolvedDns { shared, overrides }
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
    }

    let items: Vec<SubItem> = if let Some(ref si) = sub.subscribe_items {
        serde_json::from_value(si.clone()).unwrap_or_default()
    } else if let Some(ref url) = sub.subscribe_url {
        parse_subscribe_url(url).into_iter().map(|u| SubItem {
            url: u, prefix: String::new(), enabled: Some(true), cache_ttl_minutes: None,
        }).collect()
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
        if item.enabled == Some(false) { continue; }
        let source_index = idx + 1;
        let cache_ttl = item.cache_ttl_minutes.or(sub.cache_ttl_minutes).unwrap_or(60);

        let text = if let Some(cached) = cache::get(&item.url, cache_ttl) {
            cached
        } else {
            match client.get(&item.url).send().await {
                Ok(resp) => {
                    let status = resp.status().as_u16();
                    match resp.text().await {
                        Ok(text) => {
                            if cache_ttl > 0 { cache::set(&item.url, text.clone(), status); }
                            text
                        }
                        Err(e) => { warn!("Failed to read response from {}: {}", item.url, e); continue; }
                    }
                }
                Err(e) => { warn!("Failed to fetch subscription {}: {}", item.url, e); continue; }
            }
        };

        let mut parsed = parse_subscription(&text);
        let normalized_prefix = normalize_prefix(&item.prefix);
        if !normalized_prefix.is_empty() {
            for p in &mut parsed { p.name = format!("{}{}", normalized_prefix, p.name); }
        }

        for p in parsed {
            let mut p = p;
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
    }

    let items: Vec<SubscribeItem> = if let Some(ref si) = sub.subscribe_items {
        serde_json::from_value(si.clone()).unwrap_or_default()
    } else if let Some(ref url) = sub.subscribe_url {
        parse_subscribe_url(url).into_iter().map(|u| SubscribeItem {
            url: u, prefix: String::new(), enabled: Some(true), cache_ttl_minutes: None,
        }).collect()
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
        "sing-box" => vec!["ssr", "anytls"],
        "sing-box-v12" => vec!["ssr"],
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

        let cache_ttl = item.cache_ttl_minutes.or(sub.cache_ttl_minutes).unwrap_or(60);

        // Check cache
        let text = if let Some(cached) = cache::get(&item.url, cache_ttl) {
            cached
        } else {
            match client.get(&item.url).send().await {
                Ok(resp) => {
                    let status = resp.status().as_u16();
                    match resp.text().await {
                        Ok(text) => {
                            if cache_ttl > 0 {
                                cache::set(&item.url, text.clone(), status);
                            }
                            text
                        }
                        Err(e) => {
                            warn!("Failed to read response from {}: {}", item.url, e);
                            continue;
                        }
                    }
                }
                Err(e) => {
                    warn!("Failed to fetch subscription {}: {}", item.url, e);
                    continue;
                }
            }
        };

        let mut parsed = parse_subscription(&text);

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
        if custom.is_empty() { default_rp.clone() } else { custom }
    };

    let mut rule_set: Vec<String> = Vec::new();
    let mut rule_providers = Map::new();
    for (group_name, items) in &rule_providers_list {
        if let Some(arr) = items.as_array() {
            for item in arr {
                let name = item.get("name").and_then(|v| v.as_str()).unwrap_or("");
                let url = item.get("url").and_then(|v| v.as_str()).unwrap_or("");
                let behavior = item.get("type").and_then(|v| v.as_str()).unwrap_or("classical");
                rule_set.push(format!("RULE-SET,{},{}", name, group_name));
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
        if custom.is_empty() { default_groups.clone() } else { custom }
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
            let readonly = g.get("readonly").and_then(|v| v.as_bool()).unwrap_or(false);

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

/// Build a complete Sing-box JSON config.
pub fn build_singbox_config(
    sub: &proxy_subscribes::Model,
    proxies: &[ClashProxy],
    is_v12: bool,
    public_server_url: &str,
) -> Value {
    let dns = resolve_dns_config(sub.use_system_dns_config, sub.dns_config.as_deref());
    let node_names: Vec<&str> = proxies.iter().map(|p| p.name.as_str()).collect();

    // Convert proxies to sing-box outbounds
    let mut outbounds: Vec<Value> = Vec::new();
    outbounds.push(json!({"type": "direct", "tag": "🚀 直接连接"}));
    if !is_v12 {
        outbounds.push(json!({"tag": "dns-out", "type": "dns"}));
    }
    outbounds.push(json!({"type": "block", "tag": "reject"}));

    for p in proxies {
        if let Some(ob) = convert_clash_proxy_to_singbox(p) {
            outbounds.push(ob);
        }
    }

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
        if custom.is_empty() { default_groups.clone() } else { custom }
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
                g.as_object_mut().unwrap().insert("proxies".into(), json!(mapped));
            }
            g
        })
        .collect();

    // Build selector outbounds
    for g in &groups {
        let name = g.get("name").and_then(|v| v.as_str()).unwrap_or("");
        let readonly = g.get("readonly").and_then(|v| v.as_bool()).unwrap_or(false);
        let base_proxies: Vec<String> = g
            .get("proxies")
            .and_then(|v| v.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(|v| v.as_str().map(String::from))
                    .collect()
            })
            .unwrap_or_default();

        let mut all_outbounds: Vec<String> = base_proxies.clone();
        if !readonly {
            for n in &node_names {
                all_outbounds.push(n.to_string());
            }
        }

        let default_ob = all_outbounds.first().cloned().unwrap_or_default();
        outbounds.push(json!({
            "type": "selector",
            "tag": name,
            "outbounds": all_outbounds,
            "default": default_ob,
            "interrupt_exist_connections": true,
        }));
    }

    // Rule providers list
    let default_rp: Map<String, Value> = parse_jsonc(DEFAULT_RULE_PROVIDERS_JSON, Map::new());
    let rule_providers_list: Map<String, Value> = if sub.use_system_rule_list {
        default_rp.clone()
    } else {
        let custom: Map<String, Value> = safe_parse_jsonc(sub.rule_list.as_deref(), Map::new());
        if custom.is_empty() { default_rp.clone() } else { custom }
    };

    let convert_rule_base = if is_v12 {
        format!("{}/public/proxy/sing-box/convert/rule/12", public_server_url)
    } else {
        format!("{}/public/proxy/sing-box/convert/rule", public_server_url)
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

    // DNS section
    let dns_section = build_singbox_dns(&dns, is_v12);

    // Inbounds
    let inbounds = if is_v12 {
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
    let route_rules = if is_v12 {
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

    // Geo rule sets
    let gfwblack_url = if is_v12 {
        format!(
            "{}/public/proxy/sing-box/convert/rule/12?url={}",
            public_server_url,
            urlencoding::encode("https://cdn.jsdelivr.net/gh/ohmywrt/clash-rule@master/gfwip.yaml")
        )
    } else {
        format!(
            "{}/public/proxy/sing-box/convert/rule?url={}",
            public_server_url,
            urlencoding::encode("https://cdn.jsdelivr.net/gh/ohmywrt/clash-rule@master/gfwip.yaml")
        )
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
    if is_v12 {
        route["default_domain_resolver"] = json!("local");
    }

    let mut config = json!({
        "log": {"disabled": false, "level": "info", "timestamp": true},
        "dns": dns_section,
        "inbounds": inbounds,
        "outbounds": outbounds,
        "route": route,
        "experimental": {
            "cache_file": {
                "enabled": true,
                "store_fakeip": dns.shared.fakeip_enabled,
                "store_rdrc": false
            },
            "clash_api": {
                "external_controller": format!("0.0.0.0:{}", dns.shared.clash_api_port),
                "external_ui": dns.shared.clash_api_ui_path,
                "external_ui_download_url": "https://gh-proxy.org/https://github.com/MetaCubeX/metacubexd/archive/refs/heads/gh-pages.zip",
                "secret": dns.shared.clash_api_secret,
                "default_mode": "rule"
            }
        }
    });

    // Add custom rules and rule_set rules to route
    let default_custom: Vec<Value> = parse_jsonc(DEFAULT_CUSTOM_CONFIG_JSON, Vec::new());
    let custom_config: Vec<Value> = if sub.use_system_custom_config {
        default_custom
    } else {
        safe_parse_jsonc(sub.custom_config.as_deref(), Vec::new())
    };

    if let Some(route_obj) = config.get_mut("route").and_then(|r| r.as_object_mut()) {
        if let Some(rules_arr) = route_obj.get_mut("rules").and_then(|r| r.as_array_mut()) {
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
                        .filter_map(|item| {
                            item.get("name")
                                .and_then(|v| v.as_str())
                                .map(|s| json!(s))
                        })
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
    }

    config
}

fn build_singbox_dns(dns: &ResolvedDns, is_v12: bool) -> Value {
    let override_key = if is_v12 { "singboxV12" } else { "singbox" };
    let fallback_key = if is_v12 { "singbox" } else { "" };

    if let Some(ov) = dns.overrides.get(override_key) {
        return ov.clone();
    }
    if !fallback_key.is_empty() {
        if let Some(ov) = dns.overrides.get(fallback_key) {
            return ov.clone();
        }
    }

    let s = &dns.shared;

    if is_v12 {
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
        let mut servers = vec![
            json!({"tag": "local", "address": s.local_dns, "detour": "🚀 直接连接"}),
        ];
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
