use base64::engine::general_purpose;
use base64::Engine;
use serde_json::{Map, Value};
use tracing::warn;

use super::types::ClashProxy;

/// Try decoding base64 with multiple strategies: STANDARD, STANDARD_NO_PAD,
/// URL_SAFE, URL_SAFE_NO_PAD. Many subscription providers omit padding or use
/// URL-safe alphabet.
pub fn lenient_base64_decode(input: &str) -> Option<Vec<u8>> {
    general_purpose::STANDARD
        .decode(input)
        .or_else(|_| general_purpose::STANDARD_NO_PAD.decode(input))
        .or_else(|_| general_purpose::URL_SAFE.decode(input))
        .or_else(|_| general_purpose::URL_SAFE_NO_PAD.decode(input))
        .ok()
}

/// Detect whether the text is a Base64-encoded subscription (each line is a proxy URI).
pub fn is_base64_subscription(text: &str) -> bool {
    let trimmed = text.trim();
    if trimmed.starts_with("proxies:")
        || trimmed.starts_with("port:")
        || trimmed.starts_with('#')
        || trimmed.contains("\nproxies:")
    {
        return false;
    }

    if let Some(decoded) = lenient_base64_decode(trimmed) {
        if let Ok(s) = String::from_utf8(decoded) {
            return s
                .lines()
                .any(|l| {
                    let l = l.trim();
                    l.starts_with("vless://")
                        || l.starts_with("vmess://")
                        || l.starts_with("ss://")
                        || l.starts_with("trojan://")
                        || l.starts_with("ssr://")
                        || l.starts_with("hysteria://")
                        || l.starts_with("hysteria2://")
                        || l.starts_with("hy2://")
                        || l.starts_with("anytls://")
                });
        }
    }
    false
}

/// Parse subscription text (auto-detect Base64 or YAML).
pub fn parse_subscription(text: &str) -> Vec<ClashProxy> {
    let nodes = if is_base64_subscription(text) {
        parse_base64_subscription(text)
    } else {
        parse_yaml_subscription(text)
    };
    nodes.into_iter().filter(|p| !is_placeholder_node(p)).collect()
}

/// Detect placeholder/error nodes returned by providers when a subscription is
/// expired, blocked, or the UA is not recognized. These fake nodes typically use
/// loopback addresses with port 0 or 1.
fn is_placeholder_node(p: &ClashProxy) -> bool {
    let loopback = p.server == "127.0.0.1" || p.server == "::1" || p.server == "localhost";
    loopback && p.port <= 1
}

fn parse_base64_subscription(text: &str) -> Vec<ClashProxy> {
    let decoded = match lenient_base64_decode(text.trim()) {
        Some(d) => d,
        None => return Vec::new(),
    };
    let s = match String::from_utf8(decoded) {
        Ok(s) => s,
        Err(_) => return Vec::new(),
    };

    let mut proxies = Vec::new();
    for line in s.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        match parse_proxy_uri(line) {
            Some(p) => proxies.push(p),
            None => warn!("Failed to parse proxy URI: {}", line),
        }
    }
    proxies
}

fn parse_yaml_subscription(text: &str) -> Vec<ClashProxy> {
    #[derive(serde::Deserialize)]
    struct ClashConfig {
        proxies: Option<Vec<ClashProxy>>,
    }

    match serde_yaml::from_str::<ClashConfig>(text) {
        Ok(c) => c.proxies.unwrap_or_default(),
        Err(e) => {
            warn!("Failed to parse YAML subscription: {}", e);
            Vec::new()
        }
    }
}

fn parse_proxy_uri(uri: &str) -> Option<ClashProxy> {
    if uri.starts_with("vless://") {
        return parse_vless_uri(uri);
    }
    if uri.starts_with("vmess://") {
        return parse_vmess_uri(uri);
    }
    if uri.starts_with("ss://") {
        return parse_ss_uri(uri);
    }
    if uri.starts_with("trojan://") {
        return parse_trojan_uri(uri);
    }
    if uri.starts_with("hysteria2://") || uri.starts_with("hy2://") {
        return parse_hysteria2_uri(uri);
    }
    if uri.starts_with("anytls://") {
        return parse_anytls_uri(uri);
    }
    None
}

// ─── Helpers ───

fn url_decode(s: &str) -> String {
    urlencoding::decode(s).unwrap_or(std::borrow::Cow::Borrowed(s)).into_owned()
}

fn parse_url_fragment(url: &url::Url) -> String {
    url.fragment()
        .map(|f| url_decode(f))
        .unwrap_or_default()
}

fn query_params(url: &url::Url) -> std::collections::HashMap<String, String> {
    url.query_pairs()
        .map(|(k, v)| (k.into_owned(), v.into_owned()))
        .collect()
}

fn b64_decode_str(s: &str) -> Option<String> {
    // Try standard then URL-safe
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(s)
        .or_else(|_| base64::engine::general_purpose::URL_SAFE_NO_PAD.decode(s))
        .ok()?;
    String::from_utf8(bytes).ok()
}

fn make_proxy(name: String, ptype: &str, server: String, port: u16, extra: Map<String, Value>) -> ClashProxy {
    ClashProxy {
        name,
        proxy_type: ptype.to_string(),
        server,
        port,
        extra,
    }
}

// ─── VLESS ───

pub fn parse_vless_uri(uri: &str) -> Option<ClashProxy> {
    let url = url::Url::parse(uri).ok()?;
    let uuid = url.username().to_string();
    let server = url.host_str()?.to_string();
    let port = url.port()?;
    let name_raw = parse_url_fragment(&url);
    let name = if name_raw.is_empty() {
        format!("{}:{}", server, port)
    } else {
        name_raw
    };
    let params = query_params(&url);

    let mut extra = Map::new();
    extra.insert("uuid".into(), Value::String(uuid));
    extra.insert("udp".into(), Value::Bool(true));

    let network = params.get("type").map(|s| s.as_str()).unwrap_or("tcp");
    if network != "tcp" {
        extra.insert("network".into(), Value::String(network.to_string()));
    }

    if network == "ws" {
        let mut ws: Map<String, Value> = Map::new();
        let path = params.get("path").map(|p| url_decode(p)).unwrap_or_else(|| "/".into());
        ws.insert("path".into(), Value::String(path));
        if let Some(host) = params.get("host") {
            let mut headers = Map::new();
            headers.insert("Host".into(), Value::String(host.clone()));
            ws.insert("headers".into(), Value::Object(headers));
        }
        extra.insert("ws-opts".into(), Value::Object(ws));
    }

    if network == "grpc" {
        let mut grpc = Map::new();
        grpc.insert(
            "grpc-service-name".into(),
            Value::String(params.get("serviceName").cloned().unwrap_or_default()),
        );
        extra.insert("grpc-opts".into(), Value::Object(grpc));
    }

    let security = params.get("security").map(|s| s.as_str()).unwrap_or("");
    if security == "tls" {
        extra.insert("tls".into(), Value::Bool(true));
        if let Some(sni) = params.get("sni") {
            extra.insert("servername".into(), Value::String(sni.clone()));
        }
        if let Some(fp) = params.get("fp") {
            extra.insert("client-fingerprint".into(), Value::String(fp.clone()));
        }
        if let Some(alpn) = params.get("alpn") {
            let arr: Vec<Value> = alpn.split(',').map(|s| Value::String(s.to_string())).collect();
            extra.insert("alpn".into(), Value::Array(arr));
        }
        if params.get("insecure").map(|s| s.as_str()) == Some("1") {
            extra.insert("skip-cert-verify".into(), Value::Bool(true));
        }
    }

    if security == "reality" {
        extra.insert("tls".into(), Value::Bool(true));
        let mut reality = Map::new();
        reality.insert(
            "public-key".into(),
            Value::String(params.get("pbk").cloned().unwrap_or_default()),
        );
        reality.insert(
            "short-id".into(),
            Value::String(params.get("sid").cloned().unwrap_or_default()),
        );
        extra.insert("reality-opts".into(), Value::Object(reality));
        if let Some(sni) = params.get("sni") {
            extra.insert("servername".into(), Value::String(sni.clone()));
        }
        if let Some(fp) = params.get("fp") {
            extra.insert("client-fingerprint".into(), Value::String(fp.clone()));
        }
    }

    if let Some(flow) = params.get("flow") {
        if !flow.is_empty() {
            extra.insert("flow".into(), Value::String(flow.clone()));
        }
    }

    Some(make_proxy(name, "vless", server, port, extra))
}

// ─── VMess ───

pub fn parse_vmess_uri(uri: &str) -> Option<ClashProxy> {
    let content = &uri[8..]; // strip "vmess://"
    let content_no_hash = content.split('#').next().unwrap_or(content);

    // Try Base64 JSON format
    if let Some(decoded) = b64_decode_str(content_no_hash) {
        if let Ok(config) = serde_json::from_str::<serde_json::Value>(&decoded) {
            let obj = config.as_object()?;
            let add = obj.get("add")?.as_str()?.to_string();
            let port_val = obj.get("port")?;
            let port: u16 = match port_val {
                Value::Number(n) => n.as_u64()? as u16,
                Value::String(s) => s.parse().ok()?,
                _ => return None,
            };
            let name = obj
                .get("ps")
                .or(obj.get("remarks"))
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
                .unwrap_or_else(|| format!("{}:{}", add, port));

            let mut extra = Map::new();
            if let Some(id) = obj.get("id").and_then(|v| v.as_str()) {
                extra.insert("uuid".into(), Value::String(id.to_string()));
            }
            let aid = obj
                .get("aid")
                .and_then(|v| match v {
                    Value::Number(n) => n.as_i64(),
                    Value::String(s) => s.parse().ok(),
                    _ => None,
                })
                .unwrap_or(0);
            extra.insert("alterId".into(), Value::Number(aid.into()));
            let cipher = obj
                .get("scy")
                .and_then(|v| v.as_str())
                .unwrap_or("auto");
            extra.insert("cipher".into(), Value::String(cipher.to_string()));
            extra.insert("udp".into(), Value::Bool(true));

            let network = obj.get("net").and_then(|v| v.as_str()).unwrap_or("tcp");
            if network != "tcp" {
                extra.insert("network".into(), Value::String(network.to_string()));
            }

            if network == "ws" {
                let mut ws = Map::new();
                let path = obj.get("path").and_then(|v| v.as_str()).unwrap_or("/");
                ws.insert("path".into(), Value::String(path.to_string()));
                if let Some(host) = obj.get("host").and_then(|v| v.as_str()) {
                    if !host.is_empty() {
                        let mut headers = Map::new();
                        headers.insert("Host".into(), Value::String(host.to_string()));
                        ws.insert("headers".into(), Value::Object(headers));
                    }
                }
                extra.insert("ws-opts".into(), Value::Object(ws));
            }

            if network == "grpc" {
                let mut grpc = Map::new();
                let sn = obj.get("path").and_then(|v| v.as_str()).unwrap_or("");
                grpc.insert("grpc-service-name".into(), Value::String(sn.to_string()));
                extra.insert("grpc-opts".into(), Value::Object(grpc));
            }

            if obj.get("tls").and_then(|v| v.as_str()) == Some("tls") {
                extra.insert("tls".into(), Value::Bool(true));
                if let Some(sni) = obj.get("sni").and_then(|v| v.as_str()) {
                    if !sni.is_empty() {
                        extra.insert("servername".into(), Value::String(sni.to_string()));
                    }
                }
                if let Some(alpn) = obj.get("alpn") {
                    match alpn {
                        Value::String(s) => {
                            let arr: Vec<Value> = s.split(',').map(|s| Value::String(s.to_string())).collect();
                            extra.insert("alpn".into(), Value::Array(arr));
                        }
                        Value::Array(a) => {
                            extra.insert("alpn".into(), Value::Array(a.clone()));
                        }
                        _ => {}
                    }
                }
                if let Some(fp) = obj.get("fp").and_then(|v| v.as_str()) {
                    if !fp.is_empty() {
                        extra.insert("client-fingerprint".into(), Value::String(fp.to_string()));
                    }
                }
            }

            return Some(make_proxy(name, "vmess", add, port, extra));
        }
    }

    // Fallback: URL format
    let url = url::Url::parse(uri).ok()?;
    let uuid = url.username().to_string();
    let server = url.host_str()?.to_string();
    let port = url.port()?;
    let name_raw = parse_url_fragment(&url);
    let name = if name_raw.is_empty() {
        format!("{}:{}", server, port)
    } else {
        name_raw
    };

    let mut extra = Map::new();
    extra.insert("uuid".into(), Value::String(uuid));
    extra.insert("alterId".into(), Value::Number(0.into()));
    extra.insert("cipher".into(), Value::String("auto".into()));
    extra.insert("udp".into(), Value::Bool(true));

    Some(make_proxy(name, "vmess", server, port, extra))
}

// ─── Shadowsocks ───

pub fn parse_ss_uri(uri: &str) -> Option<ClashProxy> {
    // Try URL::parse first — handles query string + fragment cleanly
    if let Ok(url) = url::Url::parse(uri) {
        let name_raw = parse_url_fragment(&url);
        let server = url.host_str()?.to_string();
        let port = url.port()?;
        let params = query_params(&url);

        // userinfo is base64(method:password) — may contain URL encoding
        let user_info = url_decode(url.username());
        if let Some(decoded) = b64_decode_str(&user_info) {
            if let Some(c_idx) = decoded.find(':') {
                let method = &decoded[..c_idx];
                let password = &decoded[c_idx + 1..];
                let node_name = if name_raw.is_empty() {
                    format!("{}:{}", server, port)
                } else {
                    name_raw
                };

                let mut extra = Map::new();
                extra.insert("cipher".into(), Value::String(method.to_string()));
                extra.insert("password".into(), Value::String(password.to_string()));
                extra.insert("udp".into(), Value::Bool(true));

                // SIP003 plugin support (plugin=obfs-local;obfs=http;obfs-host=...)
                if let Some(plugin_str) = params.get("plugin") {
                    parse_ss_plugin(plugin_str, &mut extra);
                }

                return Some(make_proxy(node_name, "ss", server, port, extra));
            }
        }
    }

    // Fallback: manual parsing for non-standard URIs
    let hash_idx = uri.find('#');
    let name = hash_idx.map(|i| url_decode(&uri[i + 1..])).unwrap_or_default();
    let after_scheme = &uri[5..]; // strip "ss://"
    let no_fragment = if let Some(i) = after_scheme.find('#') {
        &after_scheme[..i]
    } else {
        after_scheme
    };
    // Strip query string for base64 fallback
    let no_query = if let Some(i) = no_fragment.find('?') {
        &no_fragment[..i]
    } else {
        no_fragment
    };

    // Format 2: ss://base64(method:password@server:port)
    if let Some(decoded) = b64_decode_str(no_query) {
        if let Some(at_idx) = decoded.rfind('@') {
            let user_part = &decoded[..at_idx];
            let server_part = &decoded[at_idx + 1..];
            if let Some(c_idx) = user_part.find(':') {
                let method = &user_part[..c_idx];
                let password = &user_part[c_idx + 1..];
                if let Some(colon_idx) = server_part.rfind(':') {
                    let server = &server_part[..colon_idx];
                    if let Ok(port) = server_part[colon_idx + 1..].parse::<u16>() {
                        let node_name = if name.is_empty() {
                            format!("{}:{}", server, port)
                        } else {
                            name
                        };
                        let mut extra = Map::new();
                        extra.insert("cipher".into(), Value::String(method.to_string()));
                        extra.insert("password".into(), Value::String(password.to_string()));
                        extra.insert("udp".into(), Value::Bool(true));

                        return Some(make_proxy(node_name, "ss", server.to_string(), port, extra));
                    }
                }
            }
        }
    }

    None
}

/// Parse SIP003 plugin string (e.g. "obfs-local;obfs=http;obfs-host=example.com")
fn parse_ss_plugin(plugin_str: &str, extra: &mut Map<String, Value>) {
    let parts: Vec<&str> = plugin_str.split(';').collect();
    if parts.is_empty() {
        return;
    }
    let plugin_name = parts[0];
    let mut plugin_opts = Map::new();
    for part in &parts[1..] {
        if let Some((k, v)) = part.split_once('=') {
            plugin_opts.insert(k.to_string(), Value::String(v.to_string()));
        }
    }
    // Map to Clash-style plugin/plugin-opts
    extra.insert("plugin".into(), Value::String(plugin_name.to_string()));
    if !plugin_opts.is_empty() {
        // Clash expects "mode" instead of "obfs" for obfs-local
        if plugin_name == "obfs-local" || plugin_name == "obfs" {
            if let Some(mode) = plugin_opts.remove("obfs") {
                plugin_opts.insert("mode".into(), mode);
            }
            if let Some(host) = plugin_opts.remove("obfs-host") {
                plugin_opts.insert("host".into(), host);
            }
        }
        extra.insert("plugin-opts".into(), Value::Object(plugin_opts));
    }
}

// ─── Trojan ───

pub fn parse_trojan_uri(uri: &str) -> Option<ClashProxy> {
    let url = url::Url::parse(uri).ok()?;
    let password = url_decode(url.username());
    let server = url.host_str()?.to_string();
    let port = url.port()?;
    let name_raw = parse_url_fragment(&url);
    let name = if name_raw.is_empty() {
        format!("{}:{}", server, port)
    } else {
        name_raw
    };
    let params = query_params(&url);

    let mut extra = Map::new();
    extra.insert("password".into(), Value::String(password));
    extra.insert("udp".into(), Value::Bool(true));

    if let Some(sni) = params.get("sni") {
        extra.insert("sni".into(), Value::String(sni.clone()));
    }
    if let Some(alpn) = params.get("alpn") {
        let arr: Vec<Value> = alpn.split(',').map(|s| Value::String(s.to_string())).collect();
        extra.insert("alpn".into(), Value::Array(arr));
    }
    if let Some(fp) = params.get("fp") {
        extra.insert("client-fingerprint".into(), Value::String(fp.clone()));
    }
    if params.get("allowInsecure").map(|s| s.as_str()) == Some("1")
        || params.get("insecure").map(|s| s.as_str()) == Some("1")
    {
        extra.insert("skip-cert-verify".into(), Value::Bool(true));
    }

    let network = params.get("type").map(|s| s.as_str()).unwrap_or("tcp");
    if network == "ws" {
        extra.insert("network".into(), Value::String("ws".into()));
        let mut ws = Map::new();
        let path = params.get("path").map(|p| url_decode(p)).unwrap_or_else(|| "/".into());
        ws.insert("path".into(), Value::String(path));
        if let Some(host) = params.get("host") {
            let mut headers = Map::new();
            headers.insert("Host".into(), Value::String(host.clone()));
            ws.insert("headers".into(), Value::Object(headers));
        }
        extra.insert("ws-opts".into(), Value::Object(ws));
    }
    if network == "grpc" {
        extra.insert("network".into(), Value::String("grpc".into()));
        let mut grpc = Map::new();
        grpc.insert(
            "grpc-service-name".into(),
            Value::String(params.get("serviceName").cloned().unwrap_or_default()),
        );
        extra.insert("grpc-opts".into(), Value::Object(grpc));
    }

    Some(make_proxy(name, "trojan", server, port, extra))
}

// ─── Hysteria2 / hy2 ───

pub fn parse_hysteria2_uri(uri: &str) -> Option<ClashProxy> {
    let url = url::Url::parse(uri).ok()?;
    let password = url_decode(url.username());
    let server = url.host_str()?.to_string();
    let port = url.port()?;
    let name_raw = parse_url_fragment(&url);
    let name = if name_raw.is_empty() {
        format!("{}:{}", server, port)
    } else {
        name_raw
    };
    let params = query_params(&url);

    let mut extra = Map::new();
    extra.insert("password".into(), Value::String(password));

    if let Some(sni) = params.get("sni") {
        extra.insert("sni".into(), Value::String(sni.clone()));
    }
    if let Some(obfs) = params.get("obfs") {
        if let Some(obfs_pw) = params.get("obfs-password") {
            extra.insert("obfs".into(), Value::String(obfs.clone()));
            extra.insert("obfs-password".into(), Value::String(obfs_pw.clone()));
        }
    }
    if params.get("insecure").map(|s| s.as_str()) == Some("1") {
        extra.insert("skip-cert-verify".into(), Value::Bool(true));
    }
    if let Some(alpn) = params.get("alpn") {
        let arr: Vec<Value> = alpn.split(',').map(|s| Value::String(s.to_string())).collect();
        extra.insert("alpn".into(), Value::Array(arr));
    }

    Some(make_proxy(name, "hysteria2", server, port, extra))
}

// ─── AnyTLS ───

pub fn parse_anytls_uri(uri: &str) -> Option<ClashProxy> {
    let url = url::Url::parse(uri).ok()?;
    let password = url_decode(url.username());
    let server = url.host_str()?.to_string();
    let port = url.port()?;
    let name_raw = parse_url_fragment(&url);
    let name = if name_raw.is_empty() {
        format!("{}:{}", server, port)
    } else {
        name_raw
    };
    let params = query_params(&url);

    let mut extra = Map::new();
    extra.insert("password".into(), Value::String(password));
    extra.insert("udp".into(), Value::Bool(true));

    if let Some(sni) = params.get("sni") {
        extra.insert("sni".into(), Value::String(sni.clone()));
    }
    if params.get("insecure").map(|s| s.as_str()) == Some("1") {
        extra.insert("skip-cert-verify".into(), Value::Bool(true));
    }
    if let Some(fp) = params.get("fp") {
        extra.insert("client-fingerprint".into(), Value::String(fp.clone()));
    }
    if let Some(alpn) = params.get("alpn") {
        let arr: Vec<Value> = alpn.split(',').map(|s| Value::String(s.to_string())).collect();
        extra.insert("alpn".into(), Value::Array(arr));
    }

    Some(make_proxy(name, "anytls", server, port, extra))
}
