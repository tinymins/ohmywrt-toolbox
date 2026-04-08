use serde_json::{json, Map, Value};

use super::types::ClashProxy;

/// Build a flat map of output dot-paths → origin info for field provenance tracing.
///
/// Each entry describes where a Sing-box output field came from in the Clash proxy input.
/// This is used by the debug UI to let users click on any output field and see its provenance.
pub fn build_field_origins(proxy: &ClashProxy, outbound: &Value) -> Map<String, Value> {
    let mut origins = Map::new();

    add_core_origins(&mut origins, proxy, outbound);

    if let Some(Value::Object(_)) = outbound.get("tls") {
        add_tls_origins(&mut origins, proxy, outbound);
    }

    if let Some(Value::Object(_)) = outbound.get("transport") {
        add_transport_origins(&mut origins, proxy, outbound);
    }

    if let Some(Value::Object(_)) = outbound.get("multiplex") {
        add_multiplex_origins(&mut origins, proxy);
    }

    add_dial_origins(&mut origins, proxy, outbound);

    match proxy.proxy_type.as_str() {
        "vmess" => add_vmess_origins(&mut origins, proxy),
        "vless" => add_vless_origins(&mut origins, proxy, outbound),
        "ss" => add_ss_origins(&mut origins, proxy, outbound),
        "trojan" => add_trojan_origins(&mut origins, proxy),
        "hysteria2" => add_hysteria2_origins(&mut origins, proxy, outbound),
        "hysteria" => add_hysteria_origins(&mut origins, proxy, outbound),
        "tuic" => add_tuic_origins(&mut origins, proxy, outbound),
        "http" => add_http_origins(&mut origins, proxy),
        "socks5" => add_socks5_origins(&mut origins, proxy),
        "anytls" => add_anytls_origins(&mut origins, proxy),
        _ => {}
    }

    // Catch any output leaf not yet mapped
    fill_unmapped_leaves(&mut origins, outbound, "");

    origins
}

// ─── Helpers ───

fn mapped(source_key: &str, step: &str, transform: &str) -> Value {
    json!({ "sourceKey": source_key, "step": step, "transform": transform })
}

fn mapped_val(source_key: &str, source_value: &Value, step: &str, transform: &str) -> Value {
    json!({
        "sourceKey": source_key,
        "sourceValue": source_value,
        "step": step,
        "transform": transform,
    })
}

fn generated(step: &str, reason: &str) -> Value {
    json!({ "sourceKey": null, "step": step, "transform": "generated", "reason": reason })
}

fn container(step: &str, sources: &[&str]) -> Value {
    json!({ "sourceKey": null, "step": step, "transform": "container", "sources": sources })
}

// ─── Core fields ───

fn add_core_origins(o: &mut Map<String, Value>, proxy: &ClashProxy, outbound: &Value) {
    o.insert("type".into(), mapped_val("type", &json!(proxy.proxy_type), "core", "direct"));
    o.insert("tag".into(), mapped_val("name", &json!(proxy.name), "core", "rename"));
    o.insert("server".into(), mapped_val("server", &json!(proxy.server), "core", "direct"));
    o.insert("server_port".into(), mapped_val("port", &json!(proxy.port), "core", "rename"));

    if outbound.get("network").is_some() {
        o.insert("network".into(), mapped_val("udp", &json!(false), "core", "convert"));
    }
}

// ─── TLS ───

fn add_tls_origins(o: &mut Map<String, Value>, proxy: &ClashProxy, outbound: &Value) {
    let pt = proxy.proxy_type.as_str();
    let force_tls = matches!(pt, "trojan" | "hysteria2" | "hysteria" | "tuic" | "anytls");

    let tls_sources: Vec<&str> = [
        "tls", "servername", "sni", "alpn", "skip-cert-verify",
        "client-fingerprint", "reality-opts",
    ]
    .iter()
    .filter(|k| proxy.extra.contains_key(**k))
    .copied()
    .collect();

    o.insert("tls".into(), container("tls", &tls_sources));

    // tls.enabled
    if force_tls {
        o.insert("tls.enabled".into(), generated("tls", &format!("{pt}_requires_tls")));
    } else if proxy.extra.contains_key("tls") {
        o.insert("tls.enabled".into(), mapped("tls", "tls", "convert"));
    }

    // tls.server_name — fallback chain: servername → sni → server (hysteria2)
    if let Some(Value::Object(tls_obj)) = outbound.get("tls") {
        if tls_obj.contains_key("server_name") {
            if proxy.str_field("servername").is_some() {
                o.insert("tls.server_name".into(), mapped("servername", "tls", "rename"));
            } else if proxy.str_field("sni").is_some() {
                o.insert("tls.server_name".into(), mapped("sni", "tls", "rename"));
            } else if matches!(pt, "hysteria2") {
                o.insert(
                    "tls.server_name".into(),
                    mapped_val("server", &json!(proxy.server), "tls", "fallback"),
                );
            }
        }

        if tls_obj.contains_key("alpn") {
            o.insert("tls.alpn".into(), mapped("alpn", "tls", "direct"));
        }
        if tls_obj.contains_key("insecure") {
            o.insert("tls.insecure".into(), mapped("skip-cert-verify", "tls", "rename"));
        }

        // utls
        if tls_obj.contains_key("utls") {
            o.insert("tls.utls".into(), container("tls", &["client-fingerprint"]));
            o.insert("tls.utls.enabled".into(), generated("tls", "fingerprint_enables_utls"));
            if let Some(fp) = proxy.str_field("client-fingerprint") {
                o.insert(
                    "tls.utls.fingerprint".into(),
                    mapped_val("client-fingerprint", &json!(fp), "tls", "rename"),
                );
            }
        }

        // reality
        if tls_obj.contains_key("reality") {
            o.insert("tls.reality".into(), container("tls", &["reality-opts"]));
            o.insert("tls.reality.enabled".into(), generated("tls", "reality_opts_present"));
            if let Some(Value::Object(reality)) = proxy.extra.get("reality-opts") {
                if let Some(pk) = reality.get("public-key") {
                    o.insert(
                        "tls.reality.public_key".into(),
                        mapped_val("reality-opts.public-key", pk, "tls", "extract"),
                    );
                }
                if let Some(sid) = reality.get("short-id") {
                    o.insert(
                        "tls.reality.short_id".into(),
                        mapped_val("reality-opts.short-id", sid, "tls", "extract"),
                    );
                }
            }
        }
    }
}

// ─── Transport ───

fn add_transport_origins(o: &mut Map<String, Value>, proxy: &ClashProxy, outbound: &Value) {
    let Some(transport) = outbound.get("transport").and_then(|t| t.as_object()) else {
        return;
    };

    let transport_type = transport.get("type").and_then(|v| v.as_str()).unwrap_or("");

    // Determine source opts key
    let (source_key, source_val) = if proxy.extra.contains_key("http-opts") {
        ("http-opts", proxy.extra.get("http-opts"))
    } else if proxy.extra.contains_key("h2-opts") {
        ("h2-opts", proxy.extra.get("h2-opts"))
    } else if proxy.extra.contains_key("ws-opts") {
        ("ws-opts", proxy.extra.get("ws-opts"))
    } else if proxy.extra.contains_key("grpc-opts") {
        ("grpc-opts", proxy.extra.get("grpc-opts"))
    } else {
        return;
    };

    o.insert("transport".into(), container("transport", &[source_key]));
    o.insert(
        "transport.type".into(),
        mapped_val(source_key, &json!(transport_type), "transport", "convert"),
    );

    let opts = source_val.and_then(|v| v.as_object());

    match source_key {
        "ws-opts" => {
            if transport.contains_key("path") {
                o.insert("transport.path".into(), mapped("ws-opts.path", "transport", "extract"));
            }
            if transport.contains_key("headers") {
                o.insert("transport.headers".into(), mapped("ws-opts.headers", "transport", "extract"));
            }
            if transport.contains_key("max_early_data") {
                o.insert(
                    "transport.max_early_data".into(),
                    mapped("ws-opts.max-early-data", "transport", "extract"),
                );
            }
            if transport.contains_key("early_data_header_name") {
                o.insert(
                    "transport.early_data_header_name".into(),
                    mapped("ws-opts.early-data-header-name", "transport", "extract"),
                );
            }
        }
        "grpc-opts" => {
            if transport.contains_key("service_name") {
                o.insert(
                    "transport.service_name".into(),
                    mapped("grpc-opts.grpc-service-name", "transport", "extract"),
                );
            }
        }
        "http-opts" => {
            if transport.contains_key("path") {
                o.insert("transport.path".into(), mapped("http-opts.path", "transport", "extract"));
            }
            if transport.contains_key("method") {
                o.insert("transport.method".into(), mapped("http-opts.method", "transport", "extract"));
            }
            if transport.contains_key("headers")
                && let Some(opts_inner) = opts
                    && opts_inner.contains_key("headers") {
                        o.insert(
                            "transport.headers".into(),
                            mapped("http-opts.headers", "transport", "extract"),
                        );
                    }
        }
        "h2-opts" => {
            if transport.contains_key("host") {
                o.insert("transport.host".into(), mapped("h2-opts.host", "transport", "extract"));
            }
            if transport.contains_key("path") {
                o.insert("transport.path".into(), mapped("h2-opts.path", "transport", "extract"));
            }
        }
        _ => {}
    }
}

// ─── Multiplex ───

fn add_multiplex_origins(o: &mut Map<String, Value>, proxy: &ClashProxy) {
    let source_key = if proxy.extra.contains_key("smux") {
        "smux"
    } else if proxy.extra.contains_key("multiplex") {
        "multiplex"
    } else {
        return;
    };

    o.insert("multiplex".into(), container("multiplex", &[source_key]));
    o.insert("multiplex.enabled".into(), mapped(&format!("{source_key}.enabled"), "multiplex", "extract"));
    o.insert("multiplex.protocol".into(), mapped(&format!("{source_key}.protocol"), "multiplex", "extract"));
    o.insert(
        "multiplex.max_connections".into(),
        mapped(&format!("{source_key}.max-connections"), "multiplex", "extract"),
    );
    o.insert(
        "multiplex.min_streams".into(),
        mapped(&format!("{source_key}.min-streams"), "multiplex", "extract"),
    );
    o.insert("multiplex.padding".into(), mapped(&format!("{source_key}.padding"), "multiplex", "extract"));
}

// ─── Dial fields ───

fn add_dial_origins(o: &mut Map<String, Value>, _proxy: &ClashProxy, outbound: &Value) {
    if outbound.get("tcp_fast_open").is_some() {
        o.insert(
            "tcp_fast_open".into(),
            mapped_val("tfo", &json!(true), "dial", "rename"),
        );
    }
    if outbound.get("tcp_multi_path").is_some() {
        o.insert(
            "tcp_multi_path".into(),
            mapped_val("mptcp", &json!(true), "dial", "rename"),
        );
    }
}

// ─── Type-specific origins ───

fn add_vmess_origins(o: &mut Map<String, Value>, proxy: &ClashProxy) {
    if let Some(v) = proxy.extra.get("uuid") {
        o.insert("uuid".into(), mapped_val("uuid", v, "type", "direct"));
    }
    let cipher = proxy.str_field("cipher").unwrap_or("auto");
    o.insert("security".into(), mapped_val("cipher", &json!(cipher), "type", "rename"));
    let alt_id = proxy.i64_field("alterId").unwrap_or(0);
    o.insert("alter_id".into(), mapped_val("alterId", &json!(alt_id), "type", "rename"));
}

fn add_vless_origins(o: &mut Map<String, Value>, proxy: &ClashProxy, outbound: &Value) {
    if let Some(v) = proxy.extra.get("uuid") {
        o.insert("uuid".into(), mapped_val("uuid", v, "type", "direct"));
    }
    if outbound.get("flow").is_some()
        && let Some(flow) = proxy.str_field("flow") {
            o.insert("flow".into(), mapped_val("flow", &json!(flow), "type", "direct"));
        }
}

fn add_ss_origins(o: &mut Map<String, Value>, proxy: &ClashProxy, outbound: &Value) {
    let out_type = outbound.get("type").and_then(|v| v.as_str()).unwrap_or("");

    if out_type == "shadowtls" {
        // Shadow-TLS rewrites the entire structure
        o.insert("type".into(), mapped_val("plugin", &json!("shadow-tls"), "type", "convert"));
        if outbound.get("password").is_some() {
            o.insert("password".into(), mapped("plugin-opts.password", "type", "extract"));
        }
        if outbound.get("version").is_some() {
            o.insert("version".into(), mapped("plugin-opts.version", "type", "extract"));
        }
        // method is removed for shadowtls
    } else {
        let cipher = proxy.str_field("cipher").unwrap_or("aes-256-gcm");
        o.insert("method".into(), mapped_val("cipher", &json!(cipher), "type", "rename"));
        if let Some(v) = proxy.extra.get("password") {
            o.insert("password".into(), mapped_val("password", v, "type", "direct"));
        }

        if outbound.get("plugin").is_some() {
            if let Some(plugin) = proxy.str_field("plugin") {
                o.insert("plugin".into(), mapped_val("plugin", &json!(plugin), "type", "convert"));
            }
            if outbound.get("plugin_opts").is_some() {
                o.insert("plugin_opts".into(), mapped("plugin-opts", "type", "convert"));
            }
        }
    }
}

fn add_trojan_origins(o: &mut Map<String, Value>, proxy: &ClashProxy) {
    if let Some(v) = proxy.extra.get("password") {
        o.insert("password".into(), mapped_val("password", v, "type", "direct"));
    }
}

fn add_hysteria2_origins(o: &mut Map<String, Value>, proxy: &ClashProxy, outbound: &Value) {
    if let Some(v) = proxy.extra.get("password") {
        o.insert("password".into(), mapped_val("password", v, "type", "direct"));
    }

    if outbound.get("server_ports").is_some()
        && let Some(ports) = proxy.str_field("ports") {
            o.insert(
                "server_ports".into(),
                mapped_val("ports", &json!(ports), "type", "convert"),
            );
        }

    if outbound.get("up_mbps").is_some()
        && let Some(up) = proxy.str_field("up") {
            o.insert("up_mbps".into(), mapped_val("up", &json!(up), "type", "convert"));
        }
    if outbound.get("down_mbps").is_some()
        && let Some(down) = proxy.str_field("down") {
            o.insert("down_mbps".into(), mapped_val("down", &json!(down), "type", "convert"));
        }

    // Hysteria2 TLS is built inline (not via build_tls), re-explain specific fields
    if outbound.get("tls").is_some() && !o.contains_key("tls") {
        let tls_sources: Vec<&str> = ["sni", "skip-cert-verify", "alpn"]
            .iter()
            .filter(|k| proxy.extra.contains_key(**k))
            .copied()
            .collect();
        o.insert("tls".into(), container("tls", &tls_sources));
        o.insert("tls.enabled".into(), generated("tls", "hysteria2_requires_tls"));

        let sni = proxy.str_field("sni").unwrap_or(&proxy.server);
        if proxy.str_field("sni").is_some() {
            o.insert("tls.server_name".into(), mapped("sni", "tls", "rename"));
        } else {
            o.insert(
                "tls.server_name".into(),
                mapped_val("server", &json!(sni), "tls", "fallback"),
            );
        }
        if proxy.bool_field("skip-cert-verify") == Some(true) {
            o.insert("tls.insecure".into(), mapped("skip-cert-verify", "tls", "rename"));
        }
        if proxy.extra.contains_key("alpn") {
            o.insert("tls.alpn".into(), mapped("alpn", "tls", "direct"));
        }
    }
}

fn add_hysteria_origins(o: &mut Map<String, Value>, proxy: &ClashProxy, outbound: &Value) {
    if let Some(up) = proxy.str_field("up") {
        o.insert("up".into(), mapped_val("up", &json!(up), "type", "direct"));
    }
    if let Some(down) = proxy.str_field("down") {
        o.insert("down".into(), mapped_val("down", &json!(down), "type", "direct"));
    }
    if outbound.get("obfs").is_some()
        && let Some(obfs) = proxy.str_field("obfs") {
            o.insert("obfs".into(), mapped_val("obfs", &json!(obfs), "type", "direct"));
        }
    if outbound.get("auth_str").is_some()
        && let Some(auth) = proxy.str_field("auth-str") {
            o.insert("auth_str".into(), mapped_val("auth-str", &json!(auth), "type", "rename"));
        }

    // Hysteria TLS is also built inline
    if outbound.get("tls").is_some() && !o.contains_key("tls") {
        o.insert("tls".into(), container("tls", &["sni", "alpn", "skip-cert-verify"]));
        o.insert("tls.enabled".into(), generated("tls", "hysteria_requires_tls"));
        if let Some(sni) = proxy.str_field("sni") {
            o.insert("tls.server_name".into(), mapped_val("sni", &json!(sni), "tls", "rename"));
        } else {
            o.insert(
                "tls.server_name".into(),
                mapped_val("server", &json!(proxy.server), "tls", "fallback"),
            );
        }
        if proxy.bool_field("skip-cert-verify") == Some(true) {
            o.insert("tls.insecure".into(), mapped("skip-cert-verify", "tls", "rename"));
        }
        if proxy.extra.contains_key("alpn") {
            o.insert("tls.alpn".into(), mapped("alpn", "tls", "direct"));
        }
    }
}

fn add_tuic_origins(o: &mut Map<String, Value>, proxy: &ClashProxy, outbound: &Value) {
    if let Some(v) = proxy.extra.get("uuid") {
        o.insert("uuid".into(), mapped_val("uuid", v, "type", "direct"));
    }
    if outbound.get("password").is_some()
        && let Some(v) = proxy.extra.get("password") {
            o.insert("password".into(), mapped_val("password", v, "type", "direct"));
        }
    if outbound.get("heartbeat").is_some()
        && let Some(interval) = proxy.u64_field("heartbeat-interval") {
            o.insert(
                "heartbeat".into(),
                mapped_val("heartbeat-interval", &json!(interval), "type", "convert"),
            );
        }
    if outbound.get("zero_rtt_handshake").is_some() {
        o.insert("zero_rtt_handshake".into(), mapped("reduce-rtt", "type", "rename"));
    }
    if outbound.get("udp_relay_mode").is_some()
        && let Some(mode) = proxy.str_field("udp-relay-mode") {
            o.insert(
                "udp_relay_mode".into(),
                mapped_val("udp-relay-mode", &json!(mode), "type", "rename"),
            );
        }
    if outbound.get("congestion_control").is_some()
        && let Some(cc) = proxy.str_field("congestion-controller") {
            o.insert(
                "congestion_control".into(),
                mapped_val("congestion-controller", &json!(cc), "type", "rename"),
            );
        }
    if outbound.get("udp_over_stream").is_some() {
        o.insert("udp_over_stream".into(), mapped("udp-over-stream", "type", "rename"));
    }

    // TUIC TLS is built inline
    if outbound.get("tls").is_some() && !o.contains_key("tls") {
        o.insert("tls".into(), container("tls", &["sni", "skip-cert-verify", "alpn"]));
        o.insert("tls.enabled".into(), generated("tls", "tuic_requires_tls"));
        if proxy.str_field("sni").is_some() {
            o.insert("tls.server_name".into(), mapped("sni", "tls", "rename"));
        }
        if proxy.bool_field("skip-cert-verify") == Some(true) {
            o.insert("tls.insecure".into(), mapped("skip-cert-verify", "tls", "rename"));
        }
        if proxy.extra.contains_key("alpn") {
            o.insert("tls.alpn".into(), mapped("alpn", "tls", "direct"));
        }
    }
}

fn add_http_origins(o: &mut Map<String, Value>, proxy: &ClashProxy) {
    if let Some(u) = proxy.str_field("username") {
        o.insert("username".into(), mapped_val("username", &json!(u), "type", "direct"));
    }
    if let Some(p) = proxy.str_field("password") {
        o.insert("password".into(), mapped_val("password", &json!(p), "type", "direct"));
    }
}

fn add_socks5_origins(o: &mut Map<String, Value>, proxy: &ClashProxy) {
    if let Some(u) = proxy.str_field("username") {
        o.insert("username".into(), mapped_val("username", &json!(u), "type", "direct"));
    }
    if let Some(p) = proxy.str_field("password") {
        o.insert("password".into(), mapped_val("password", &json!(p), "type", "direct"));
    }
}

fn add_anytls_origins(o: &mut Map<String, Value>, proxy: &ClashProxy) {
    if let Some(v) = proxy.extra.get("password") {
        o.insert("password".into(), mapped_val("password", v, "type", "direct"));
    }
}

// ─── Fill unmapped leaves ───

/// Walk the outbound JSON recursively and mark any leaf field without an origin as "unknown".
fn fill_unmapped_leaves(o: &mut Map<String, Value>, value: &Value, prefix: &str) {
    match value {
        Value::Object(obj) => {
            for (k, v) in obj {
                let path = if prefix.is_empty() {
                    k.clone()
                } else {
                    format!("{prefix}.{k}")
                };
                if v.is_object() || v.is_array() {
                    fill_unmapped_leaves(o, v, &path);
                } else if !o.contains_key(&path) {
                    o.insert(path, generated("unknown", "converter_internal"));
                }
            }
        }
        Value::Array(arr) => {
            for (i, v) in arr.iter().enumerate() {
                let path = format!("{prefix}[{i}]");
                if v.is_object() || v.is_array() {
                    fill_unmapped_leaves(o, v, &path);
                }
                // Array elements inherit parent origin, don't individually track
            }
        }
        _ => {}
    }
}
