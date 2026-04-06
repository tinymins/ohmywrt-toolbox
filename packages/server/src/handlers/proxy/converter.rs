use std::collections::HashSet;

use serde_json::{json, Map, Value};

use super::types::ClashProxy;

/// Convert a Clash proxy to a Sing-box outbound JSON value.
pub fn convert_clash_proxy_to_singbox(proxy: &ClashProxy) -> Option<Value> {
    let mut out = match proxy.proxy_type.as_str() {
        "vmess" => Some(convert_vmess(proxy)),
        "vless" => Some(convert_vless(proxy)),
        "ss" => Some(convert_ss(proxy)),
        "trojan" => Some(convert_trojan(proxy)),
        "hysteria2" => Some(convert_hysteria2(proxy)),
        "hysteria" => Some(convert_hysteria(proxy)),
        "tuic" => Some(convert_tuic(proxy)),
        "http" => Some(convert_http(proxy)),
        "socks5" => Some(convert_socks5(proxy)),
        "anytls" => Some(convert_anytls(proxy)),
        _ => None,
    }?;

    // Dial fields applicable to all proxy types
    if proxy.bool_field("tfo") == Some(true) {
        out["tcp_fast_open"] = json!(true);
    }
    if proxy.bool_field("mptcp") == Some(true) {
        out["tcp_multi_path"] = json!(true);
    }

    Some(out)
}

// ─── Transport ───

fn convert_transport(proxy: &ClashProxy) -> Option<Value> {
    if let Some(Value::Object(http_opts)) = proxy.extra.get("http-opts") {
        let mut t = json!({"type": "http"});
        if let Some(Value::Array(paths)) = http_opts.get("path") {
            if let Some(first) = paths.first().and_then(|v| v.as_str()) {
                t["path"] = json!(first);
            }
        }
        if let Some(Value::String(method)) = http_opts.get("method") {
            t["method"] = json!(method);
        }
        if let Some(Value::Object(headers)) = http_opts.get("headers") {
            let mut h = Map::new();
            for (k, v) in headers {
                if let Value::Array(arr) = v {
                    if let Some(first) = arr.first().and_then(|v| v.as_str()) {
                        h.insert(k.clone(), json!(first));
                    }
                }
            }
            if !h.is_empty() {
                t["headers"] = Value::Object(h);
            }
        }
        return Some(t);
    }

    if let Some(Value::Object(h2_opts)) = proxy.extra.get("h2-opts") {
        let mut t = json!({"type": "http"});
        if let Some(host) = h2_opts.get("host") {
            t["host"] = host.clone();
        }
        if let Some(Value::String(path)) = h2_opts.get("path") {
            t["path"] = json!(path);
        }
        return Some(t);
    }

    if let Some(Value::Object(ws_opts)) = proxy.extra.get("ws-opts") {
        let mut t = json!({"type": "ws"});
        if let Some(Value::String(path)) = ws_opts.get("path") {
            t["path"] = json!(path);
        }
        if let Some(headers) = ws_opts.get("headers") {
            t["headers"] = headers.clone();
            if let Some(Value::Number(n)) = ws_opts.get("max-early-data") {
                t["max_early_data"] = json!(n);
            }
            if let Some(Value::String(s)) = ws_opts.get("early-data-header-name") {
                t["early_data_header_name"] = json!(s);
            }
        }
        return Some(t);
    }

    if let Some(Value::Object(grpc_opts)) = proxy.extra.get("grpc-opts") {
        let mut t = json!({"type": "grpc"});
        if let Some(Value::String(sn)) = grpc_opts.get("grpc-service-name") {
            t["service_name"] = json!(sn);
        }
        return Some(t);
    }

    None
}

// ─── TLS ───

fn build_tls(proxy: &ClashProxy, force_enabled: bool) -> Option<Value> {
    let tls_enabled = proxy.bool_field("tls").unwrap_or(false) || force_enabled;
    if !tls_enabled {
        return None;
    }

    let mut tls = json!({"enabled": true});

    // server_name from servername or sni
    if let Some(sn) = proxy.str_field("servername").or(proxy.str_field("sni")) {
        tls["server_name"] = json!(sn);
    }

    if let Some(Value::Array(alpn)) = proxy.extra.get("alpn") {
        tls["alpn"] = Value::Array(alpn.clone());
    }

    if proxy.bool_field("skip-cert-verify") == Some(true) {
        tls["insecure"] = json!(true);
    }

    if let Some(fp) = proxy.str_field("client-fingerprint") {
        tls["utls"] = json!({"enabled": true, "fingerprint": fp});
    }

    if let Some(Value::Object(reality)) = proxy.extra.get("reality-opts") {
        let mut r = json!({"enabled": true});
        if let Some(Value::String(pk)) = reality.get("public-key") {
            r["public_key"] = json!(pk);
        }
        if let Some(Value::String(sid)) = reality.get("short-id") {
            r["short_id"] = json!(sid);
        }
        tls["reality"] = r;
    }

    Some(tls)
}

fn build_multiplex(proxy: &ClashProxy) -> Option<Value> {
    // Clash Meta uses "smux", some configs use "multiplex"
    let smux = proxy
        .extra
        .get("smux")
        .or_else(|| proxy.extra.get("multiplex"));
    let smux_obj = match smux {
        Some(Value::Object(m)) => Some(m),
        Some(Value::Bool(true)) => None, // enabled but no details → use defaults below
        Some(_) => return None,
        None => return None,
    };

    let enabled = smux_obj
        .and_then(|m| m.get("enabled"))
        .and_then(|v| v.as_bool())
        .unwrap_or(true);
    if !enabled {
        return None;
    }

    let protocol = smux_obj
        .and_then(|m| m.get("protocol"))
        .and_then(|v| v.as_str())
        .unwrap_or("h2mux");
    let max_connections = smux_obj
        .and_then(|m| m.get("max-connections"))
        .and_then(|v| v.as_u64())
        .unwrap_or(8);
    let min_streams = smux_obj
        .and_then(|m| m.get("min-streams"))
        .and_then(|v| v.as_u64())
        .unwrap_or(16);
    let padding = smux_obj
        .and_then(|m| m.get("padding"))
        .and_then(|v| v.as_bool())
        .unwrap_or(true);

    Some(json!({
        "enabled": true,
        "protocol": protocol,
        "max_connections": max_connections,
        "min_streams": min_streams,
        "padding": padding,
        "brutal": {
            "enabled": true,
            "up_mbps": 1000,
            "down_mbps": 1000
        }
    }))
}

// ─── Converters ───

fn convert_vmess(proxy: &ClashProxy) -> Value {
    let transport = convert_transport(proxy);
    let tls = build_tls(proxy, false);
    let multiplex = build_multiplex(proxy);

    let mut out = json!({
        "type": "vmess",
        "tag": proxy.name,
        "server": proxy.server,
        "server_port": proxy.port,
        "uuid": proxy.str_field("uuid").unwrap_or(""),
        "security": proxy.str_field("cipher").unwrap_or("auto"),
        "alter_id": proxy.i64_field("alterId").unwrap_or(0),
    });

    if let Some(t) = transport {
        out["transport"] = t;
    }
    if let Some(t) = tls {
        out["tls"] = t;
    }
    if let Some(m) = multiplex {
        out["multiplex"] = m;
    }

    out
}

fn convert_vless(proxy: &ClashProxy) -> Value {
    let transport = convert_transport(proxy);
    let tls = build_tls(proxy, false);
    let multiplex = build_multiplex(proxy);

    let mut out = json!({
        "type": "vless",
        "tag": proxy.name,
        "server": proxy.server,
        "server_port": proxy.port,
        "uuid": proxy.str_field("uuid").unwrap_or(""),
    });

    if let Some(flow) = proxy.str_field("flow") {
        if !flow.is_empty() {
            out["flow"] = json!(flow);
        }
    }
    if let Some(t) = transport {
        out["transport"] = t;
    }
    if let Some(t) = tls {
        out["tls"] = t;
    }
    if let Some(m) = multiplex {
        out["multiplex"] = m;
    }

    out
}

fn convert_ss(proxy: &ClashProxy) -> Value {
    let mut out = json!({
        "type": "shadowsocks",
        "tag": proxy.name,
        "server": proxy.server,
        "server_port": proxy.port,
        "method": proxy.str_field("cipher").unwrap_or("aes-256-gcm"),
        "password": proxy.str_field("password").unwrap_or(""),
    });

    if proxy.bool_field("udp") == Some(false) {
        out["network"] = json!("tcp");
    }

    // Handle plugin
    if let Some(plugin) = proxy.str_field("plugin") {
        if plugin == "shadow-tls" {
            if let Some(Value::Object(opts)) = proxy.extra.get("plugin-opts") {
                out["type"] = json!("shadowtls");
                if let Some(Value::String(pw)) = opts.get("password") {
                    out["password"] = json!(pw);
                }
                if let Some(version) = opts.get("version") {
                    out["version"] = version.clone();
                }
                if let Some(Value::String(host)) = opts.get("host") {
                    out["tls"] = json!({"enabled": true, "server_name": host});
                }
                // Remove method for shadowtls
                if let Value::Object(ref mut m) = out {
                    m.remove("method");
                }
            }
        } else {
            let sb_plugin = if plugin == "obfs" {
                "obfs-local"
            } else {
                plugin
            };
            out["plugin"] = json!(sb_plugin);

            if let Some(Value::Object(opts)) = proxy.extra.get("plugin-opts") {
                let mut plugin_opts = String::new();
                if let Some(Value::String(mode)) = opts.get("mode") {
                    plugin_opts.push_str(&format!("mode={}", mode));
                }
                if let Some(Value::String(host)) = opts.get("host") {
                    plugin_opts.push_str(&format!(";host={}", host));
                }
                if plugin == "v2ray-plugin" {
                    if opts.get("tls").and_then(|v| v.as_bool()) == Some(true) {
                        plugin_opts.push_str(";tls");
                    }
                    if let Some(Value::String(path)) = opts.get("path") {
                        plugin_opts.push_str(&format!(";path={}", path));
                    }
                    if let Some(mux) = opts.get("mux") {
                        plugin_opts.push_str(&format!(";mux={}", mux));
                    }
                }
                out["plugin_opts"] = json!(plugin_opts);
            }
        }
    }

    out
}

fn convert_trojan(proxy: &ClashProxy) -> Value {
    let transport = convert_transport(proxy);
    let tls = build_tls(proxy, true);
    let multiplex = build_multiplex(proxy);

    let mut out = json!({
        "type": "trojan",
        "tag": proxy.name,
        "server": proxy.server,
        "server_port": proxy.port,
        "password": proxy.str_field("password").unwrap_or(""),
        "tls": tls.unwrap_or(json!({"enabled": true})),
    });

    if let Some(t) = transport {
        out["transport"] = t;
    }
    if proxy.bool_field("udp") == Some(false) {
        out["network"] = json!("tcp");
    }
    if let Some(m) = multiplex {
        out["multiplex"] = m;
    }

    out
}

fn convert_hysteria2(proxy: &ClashProxy) -> Value {
    let sni = proxy
        .str_field("sni")
        .or(Some(&proxy.server))
        .unwrap_or(&proxy.server);

    let mut tls = json!({"enabled": true, "server_name": sni});
    if proxy.bool_field("skip-cert-verify") == Some(true) {
        tls["insecure"] = json!(true);
    }
    if let Some(Value::Array(alpn)) = proxy.extra.get("alpn") {
        tls["alpn"] = Value::Array(alpn.clone());
    }

    let mut out = json!({
        "type": "hysteria2",
        "tag": proxy.name,
        "server": proxy.server,
        "server_port": proxy.port,
        "password": proxy.str_field("password").unwrap_or(""),
        "tls": tls,
    });

    // Port hopping: Clash Meta uses "ports" with dash (e.g. "20000-40000")
    // Sing-box uses "server_ports" with colon (e.g. ["20000:40000"])
    if let Some(ports) = proxy.str_field("ports") {
        let sb_ports = ports.replace('-', ":");
        out["server_ports"] = json!([sb_ports]);
    }

    // Bandwidth hints: Clash uses "up"/"down" (e.g. "200 Mbps"),
    // Sing-box uses "up_mbps"/"down_mbps" (integer)
    if let Some(up) = proxy.str_field("up") {
        if let Some(mbps) = parse_mbps(up) {
            out["up_mbps"] = json!(mbps);
        }
    }
    if let Some(down) = proxy.str_field("down") {
        if let Some(mbps) = parse_mbps(down) {
            out["down_mbps"] = json!(mbps);
        }
    }

    // NOTE: hysteria2 uses QUIC-based native multiplexing — sing-box does NOT
    // support the smux `multiplex` field on hysteria2 outbounds.  Any smux/multiplex
    // config in the Clash source is intentionally ignored and reported as an
    // informational note (blue) via known_ignored_keys(), not as data loss.

    out
}

/// Parse bandwidth string like "200 Mbps", "1000Mbps", or "50" into Mbps integer.
fn parse_mbps(s: &str) -> Option<u64> {
    let s = s.trim();
    let num_str = s
        .trim_end_matches(|c: char| c.is_alphabetic() || c == ' ')
        .trim();
    num_str.parse::<u64>().ok()
}

fn convert_hysteria(proxy: &ClashProxy) -> Value {
    let sni = proxy
        .str_field("sni")
        .unwrap_or(&proxy.server);

    let mut tls = json!({"enabled": true, "server_name": sni});
    if let Some(Value::Array(alpn)) = proxy.extra.get("alpn") {
        tls["alpn"] = Value::Array(alpn.clone());
    }
    if proxy.bool_field("skip-cert-verify") == Some(true) {
        tls["insecure"] = json!(true);
    }

    let mut out = json!({
        "type": "hysteria",
        "tag": proxy.name,
        "server": proxy.server,
        "server_port": proxy.port,
        "up": proxy.str_field("up").unwrap_or(""),
        "down": proxy.str_field("down").unwrap_or(""),
        "tls": tls,
    });

    if let Some(obfs) = proxy.str_field("obfs") {
        out["obfs"] = json!(obfs);
    }
    if let Some(auth) = proxy.str_field("auth-str") {
        out["auth_str"] = json!(auth);
    }

    out
}

fn convert_tuic(proxy: &ClashProxy) -> Value {
    let mut tls = json!({"enabled": true});
    if let Some(sni) = proxy.str_field("sni") {
        tls["server_name"] = json!(sni);
    }
    if proxy.bool_field("skip-cert-verify") == Some(true) {
        tls["insecure"] = json!(true);
    }
    if let Some(Value::Array(alpn)) = proxy.extra.get("alpn") {
        tls["alpn"] = Value::Array(alpn.clone());
    }

    let mut out = json!({
        "type": "tuic",
        "tag": proxy.name,
        "server": proxy.server,
        "server_port": proxy.port,
        "uuid": proxy.str_field("uuid").unwrap_or(""),
        "tls": tls,
    });

    if let Some(pw) = proxy.str_field("password") {
        out["password"] = json!(pw);
    }
    if let Some(interval) = proxy.u64_field("heartbeat-interval") {
        out["heartbeat"] = json!(format!("{}s", interval / 1000));
    }
    if proxy.bool_field("reduce-rtt") == Some(true) {
        out["zero_rtt_handshake"] = json!(true);
    }
    if let Some(mode) = proxy.str_field("udp-relay-mode") {
        out["udp_relay_mode"] = json!(mode);
    }
    if let Some(cc) = proxy.str_field("congestion-controller") {
        out["congestion_control"] = json!(cc);
    }
    if proxy.bool_field("udp-over-stream") == Some(true) {
        out["udp_over_stream"] = json!(true);
    }

    out
}

fn convert_http(proxy: &ClashProxy) -> Value {
    let mut out = json!({
        "type": "http",
        "tag": proxy.name,
        "server": proxy.server,
        "server_port": proxy.port,
    });

    if let Some(u) = proxy.str_field("username") {
        out["username"] = json!(u);
        if let Some(p) = proxy.str_field("password") {
            out["password"] = json!(p);
        }
    }

    if proxy.bool_field("tls") == Some(true) {
        let mut tls = json!({"enabled": true});
        if proxy.bool_field("skip-cert-verify") == Some(true) {
            tls["insecure"] = json!(true);
        }
        if let Some(sni) = proxy.str_field("sni") {
            tls["server_name"] = json!(sni);
        }
        out["tls"] = tls;
    }

    out
}

fn convert_socks5(proxy: &ClashProxy) -> Value {
    let mut out = json!({
        "type": "socks",
        "tag": proxy.name,
        "server": proxy.server,
        "server_port": proxy.port,
    });

    if proxy.bool_field("udp") == Some(false) {
        out["network"] = json!("tcp");
    }
    if let Some(u) = proxy.str_field("username") {
        out["username"] = json!(u);
        if let Some(p) = proxy.str_field("password") {
            out["password"] = json!(p);
        }
    }

    out
}

fn convert_anytls(proxy: &ClashProxy) -> Value {
    let mut tls = json!({"enabled": true});
    if let Some(sni) = proxy.str_field("sni") {
        tls["server_name"] = json!(sni);
    }
    if proxy.bool_field("skip-cert-verify") == Some(true) {
        tls["insecure"] = json!(true);
    }
    if let Some(Value::Array(alpn)) = proxy.extra.get("alpn") {
        tls["alpn"] = Value::Array(alpn.clone());
    }
    if let Some(fp) = proxy.str_field("client-fingerprint") {
        tls["utls"] = json!({"enabled": true, "fingerprint": fp});
    }

    json!({
        "type": "anytls",
        "tag": proxy.name,
        "server": proxy.server,
        "server_port": proxy.port,
        "password": proxy.str_field("password").unwrap_or(""),
        "tls": tls,
    })
}

// ─── Field tracking for entropy-loss detection ───

/// Returns the set of `extra` keys that the converter for this proxy type
/// is known to consume (or that are implicitly handled). Any keys NOT in
/// this set are "lost" during conversion.
fn known_consumed_keys(proxy_type: &str) -> HashSet<&'static str> {
    // Keys consumed by convert_transport()
    let transport: &[&str] = &["http-opts", "h2-opts", "ws-opts", "grpc-opts"];
    // "network" tells which transport, redundant with *-opts presence
    let transport_meta: &[&str] = &["network"];
    // Keys consumed by build_tls()
    let tls: &[&str] = &[
        "tls",
        "servername",
        "sni",
        "alpn",
        "skip-cert-verify",
        "client-fingerprint",
        "reality-opts",
    ];
    // Clash Meta uses "smux", some configs use "multiplex"
    let multiplex: &[&str] = &["multiplex", "smux"];

    let mut keys = HashSet::new();
    // "udp" — Sing-box enables UDP by default; udp:false → network:tcp.
    // Universally implicit across all proxy types.
    keys.insert("udp");
    // Dial fields — applicable to all TCP-based proxy types
    keys.insert("tfo");
    keys.insert("mptcp");

    match proxy_type {
        "vmess" => {
            keys.extend(transport);
            keys.extend(transport_meta);
            keys.extend(tls);
            keys.extend(multiplex);
            keys.extend(["uuid", "cipher", "alterId"]);
        }
        "vless" => {
            keys.extend(transport);
            keys.extend(transport_meta);
            keys.extend(tls);
            keys.extend(multiplex);
            keys.extend(["uuid", "flow"]);
        }
        "ss" => {
            keys.extend(["cipher", "password", "plugin", "plugin-opts"]);
        }
        "trojan" => {
            keys.extend(transport);
            keys.extend(transport_meta);
            keys.extend(tls);
            keys.extend(multiplex);
            keys.extend(["password"]);
        }
        "hysteria2" => {
            keys.extend([
                "sni",
                "skip-cert-verify",
                "password",
                "alpn",
                "ports",
                "mport",
                "hop-interval",
                "up",
                "down",
            ]);
        }
        "hysteria" => {
            keys.extend([
                "sni",
                "alpn",
                "skip-cert-verify",
                "up",
                "down",
                "obfs",
                "auth-str",
            ]);
        }
        "tuic" => {
            keys.extend([
                "sni",
                "skip-cert-verify",
                "alpn",
                "uuid",
                "password",
                "heartbeat-interval",
                "reduce-rtt",
                "udp-relay-mode",
                "congestion-controller",
                "udp-over-stream",
            ]);
        }
        "http" => {
            keys.extend(["username", "password", "tls", "skip-cert-verify", "sni"]);
        }
        "socks5" => {
            keys.extend(["username", "password"]);
        }
        "anytls" => {
            keys.extend([
                "sni",
                "skip-cert-verify",
                "alpn",
                "client-fingerprint",
                "password",
            ]);
        }
        _ => {}
    }

    keys
}

/// Keys that are intentionally ignored during conversion because they are
/// inapplicable to the target format, not because of data loss.
/// These are reported as informational notes (blue) rather than warnings (amber).
fn known_ignored_keys(proxy_type: &str) -> HashSet<&'static str> {
    let multiplex: &[&str] = &["multiplex", "smux"];
    let mut keys = HashSet::new();

    match proxy_type {
        "hysteria2" | "hysteria" | "tuic" => {
            // QUIC-based protocols use native multiplexing — sing-box does NOT
            // support the smux/multiplex field on these outbounds.
            keys.extend(multiplex);
        }
        _ => {}
    }

    keys
}

/// Convert a Clash proxy to Sing-box outbound, returning:
/// - the outbound JSON (or None if unsupported type)
/// - lost_fields: extra keys NOT consumed — real data loss (amber warning)
/// - ignored_fields: keys intentionally ignored — inapplicable to target (blue info)
pub fn convert_clash_proxy_to_singbox_with_diff(
    proxy: &ClashProxy,
) -> (Option<Value>, Vec<String>, Vec<String>) {
    let outbound = convert_clash_proxy_to_singbox(proxy);

    if outbound.is_none() {
        let lost: Vec<String> = proxy.extra.keys().cloned().collect();
        return (None, lost, Vec::new());
    }

    let consumed = known_consumed_keys(&proxy.proxy_type);
    let ignored_set = known_ignored_keys(&proxy.proxy_type);

    let mut lost = Vec::new();
    let mut ignored = Vec::new();
    for k in proxy.extra.keys() {
        if consumed.contains(k.as_str()) {
            continue;
        }
        if ignored_set.contains(k.as_str()) {
            ignored.push(k.clone());
        } else {
            lost.push(k.clone());
        }
    }

    (outbound, lost, ignored)
}
