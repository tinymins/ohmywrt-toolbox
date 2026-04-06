use serde_json::{json, Map, Value};

use super::types::ClashProxy;

/// Convert a Clash proxy to a Sing-box outbound JSON value.
pub fn convert_clash_proxy_to_singbox(proxy: &ClashProxy) -> Option<Value> {
    match proxy.proxy_type.as_str() {
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
    }
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
    if proxy.extra.get("multiplex").is_some() {
        Some(json!({
            "enabled": true,
            "protocol": "h2mux",
            "max_connections": 8,
            "min_streams": 16,
            "padding": true,
            "brutal": {
                "enabled": true,
                "up_mbps": 1000,
                "down_mbps": 1000
            }
        }))
    } else {
        None
    }
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

    json!({
        "type": "hysteria2",
        "tag": proxy.name,
        "server": proxy.server,
        "server_port": proxy.port,
        "password": proxy.str_field("password").unwrap_or(""),
        "tls": tls,
    })
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
