import { z } from "zod";

// ============================================
// Clash Proxy 类型定义
// ============================================

export const ClashProxySchema = z.object({
  name: z.string(),
  server: z.string(),
  port: z.number(),
  multiplex: z.optional(z.any())
});

export const ClashProxyBaseVmessOrVLESSSchema = ClashProxySchema.extend({
  uuid: z.string(),
  udp: z.optional(z.boolean()),
  tls: z.optional(z.boolean()),
  "skip-cert-verify": z.optional(z.boolean()),
  servername: z.optional(z.string()),
  network: z.optional(z.enum(["ws", "h2", "http", "grpc", "tcp"])),
  "ws-opts": z.optional(z.object({
    path: z.optional(z.string()),
    headers: z.optional(z.record(z.string(), z.string())),
    "max-early-data": z.optional(z.number()),
    "early-data-header-name": z.optional(z.string())
  })),
  "h2-opts": z.optional(z.object({
    host: z.optional(z.array(z.string())),
    path: z.optional(z.string())
  })),
  "http-opts": z.optional(z.object({
    method: z.optional(z.string()),
    path: z.optional(z.array(z.string())),
    headers: z.optional(z.record(z.string(), z.array(z.string())))
  })),
  "grpc-opts": z.optional(z.object({
    "grpc-service-name": z.optional(z.string())
  }))
});

export const ClashProxyHttpSchema = ClashProxySchema.extend({
  type: z.literal("http"),
  username: z.optional(z.string()),
  password: z.optional(z.string()),
  tls: z.optional(z.boolean()),
  "skip-cert-verify": z.optional(z.boolean()),
  sni: z.optional(z.string())
});

export const ClashProxyHysteriaSchema = ClashProxySchema.extend({
  type: z.literal("hysteria"),
  "auth-str": z.optional(z.string()),
  obfs: z.optional(z.string()),
  alpn: z.optional(z.array(z.string())),
  protocol: z.enum(["udp", "wechat-video", "faketcp"]),
  up: z.string(),
  down: z.string(),
  sni: z.optional(z.string()),
  tls: z.optional(z.boolean()),
  "skip-cert-verify": z.optional(z.boolean())
});

export const ClashProxyHysteria2Schema = ClashProxySchema.extend({
  type: z.literal("hysteria2"),
  password: z.optional(z.string()),
  server: z.string(),
  sni: z.optional(z.string()),
  "skip-cert-verify": z.optional(z.boolean())
});

export const ClashProxySocks5Schema = ClashProxySchema.extend({
  type: z.literal("socks5"),
  username: z.optional(z.string()),
  password: z.optional(z.string()),
  tls: z.optional(z.boolean()),
  "skip-cert-verify": z.optional(z.boolean()),
  udp: z.optional(z.boolean())
});

export const ClashProxyShadowsocksSchema = ClashProxySchema.extend({
  type: z.literal("ss"),
  cipher: z.enum([
    "2022-blake3-aes-128-gcm",
    "2022-blake3-aes-256-gcm",
    "2022-blake3-chacha20-poly1305",
    "aes-128-gcm",
    "aes-192-gcm",
    "aes-256-gcm",
    "aes-128-cfb",
    "aes-192-cfb",
    "aes-256-cfb",
    "aes-128-ctr",
    "aes-192-ctr",
    "aes-256-ctr",
    "rc4-md5",
    "chacha20-ietf",
    "xchacha20",
    "chacha20-ietf-poly1305",
    "xchacha20-ietf-poly1305"
  ]),
  password: z.string(),
  udp: z.optional(z.boolean()),
  plugin: z.optional(z.enum(["obfs", "v2ray-plugin", "shadow-tls"])),
  "plugin-opts": z.optional(z.object({
    mode: z.optional(z.enum(["http", "tls", "websocket"])),
    tls: z.optional(z.boolean()),
    host: z.optional(z.string()),
    path: z.optional(z.string()),
    mux: z.optional(z.boolean()),
    password: z.optional(z.string()),
    version: z.optional(z.number())
  }))
});

export const ClashProxyTrojanSchema = ClashProxySchema.extend({
  type: z.literal("trojan"),
  password: z.string(),
  udp: z.optional(z.boolean()),
  sni: z.optional(z.string()),
  alpn: z.optional(z.array(z.string())),
  "skip-cert-verify": z.optional(z.boolean()),
  "client-fingerprint": z.optional(z.string())
});

export const ClashProxyTUICSchema = ClashProxySchema.extend({
  type: z.literal("tuic"),
  uuid: z.string(),
  password: z.optional(z.string()),
  alpn: z.optional(z.array(z.string())),
  "heartbeat-interval": z.optional(z.number()),
  "reduce-rtt": z.optional(z.boolean()),
  "udp-relay-mode": z.optional(z.enum(["native", "quic"])),
  "congestion-controller": z.optional(z.enum(["cubic", "new_reno", "bbr"])),
  "skip-cert-verify": z.optional(z.boolean()),
  sni: z.optional(z.string()),
  "udp-over-stream": z.optional(z.boolean())
});

export const ClashProxyVmessSchema = ClashProxyBaseVmessOrVLESSSchema.extend({
  type: z.literal("vmess"),
  alterId: z.coerce.number(),
  cipher: z.enum(["aes-128-gcm", "chacha20-poly1305", "auto", "none", "zero"])
});

export const ClashProxyVLESSSchema = ClashProxyBaseVmessOrVLESSSchema.extend({
  type: z.literal("vless"),
  flow: z.optional(z.enum(["xtls-rprx-vision", "xtls-rprx-vision-udp443"])),
  "client-fingerprint": z.optional(z.string()),
  "reality-opts": z.optional(z.object({
    "short-id": z.optional(z.string()),
    "public-key": z.string()
  }))
});

export const ClashSchema = z.object({
  proxies: z.array(z.discriminatedUnion("type", [
    ClashProxyHttpSchema,
    ClashProxyHysteriaSchema,
    ClashProxyHysteria2Schema,
    ClashProxyShadowsocksSchema,
    ClashProxySocks5Schema,
    ClashProxyTrojanSchema,
    ClashProxyTUICSchema,
    ClashProxyVmessSchema,
    ClashProxyVLESSSchema
  ]))
});

// ============================================
// Sing-box Outbound 类型定义
// ============================================

export const SingboxOutboundSchema = z.object({
  tag: z.string(),
  server: z.string(),
  server_port: z.number(),
  network: z.optional(z.enum(["tcp", "udp", "tcp,udp"])),
  multiplex: z.optional(z.any())
});

export const SingboxOutboundCommonTlsSchema = z.object({
  enabled: z.boolean(),
  disable_sni: z.optional(z.boolean()),
  server_name: z.optional(z.string()),
  insecure: z.optional(z.boolean()),
  alpn: z.optional(z.array(z.string())),
  utls: z.optional(z.object({
    enabled: z.boolean(),
    fingerprint: z.string()
  })),
  reality: z.optional(z.object({
    enabled: z.boolean(),
    public_key: z.string(),
    short_id: z.optional(z.string())
  }))
});

export const SingboxOutboundCommonVmessOrVLESSTransportGrpcSchema = z.object({
  type: z.literal("grpc"),
  service_name: z.optional(z.string())
});

export const SingboxOutboundCommonVmessOrVLESSTransportHttpSchema = z.object({
  type: z.literal("http"),
  host: z.optional(z.array(z.string())),
  path: z.optional(z.string()),
  method: z.optional(z.string()),
  headers: z.optional(z.record(z.string(), z.string()))
});

export const SingboxOutboundCommonVmessOrVLESSTransportWebSocketSchema = z.object({
  type: z.literal("ws"),
  host: z.optional(z.array(z.string())),
  path: z.optional(z.string()),
  headers: z.optional(z.record(z.string(), z.string())),
  max_early_data: z.optional(z.number()),
  early_data_header_name: z.optional(z.string())
});

export const SingboxOutboundCommonVmessOrVLESSTransportSchema = z.discriminatedUnion("type", [
  SingboxOutboundCommonVmessOrVLESSTransportGrpcSchema,
  SingboxOutboundCommonVmessOrVLESSTransportHttpSchema,
  SingboxOutboundCommonVmessOrVLESSTransportWebSocketSchema
]);

export const SingboxOutboundHttpSchema = SingboxOutboundSchema.extend({
  type: z.literal("http"),
  username: z.optional(z.string()),
  password: z.optional(z.string()),
  tls: z.optional(SingboxOutboundCommonTlsSchema)
});

export const SingboxOutboundHysteriaSchema = SingboxOutboundSchema.extend({
  type: z.literal("hysteria"),
  up: z.string(),
  down: z.string(),
  obfs: z.optional(z.string()),
  auth_str: z.optional(z.string()),
  tls: SingboxOutboundCommonTlsSchema
});

export const SingboxOutboundHysteria2Schema = SingboxOutboundSchema.extend({
  type: z.literal("hysteria2"),
  up: z.optional(z.string()),
  down: z.optional(z.string()),
  obfs: z.optional(z.string()),
  password: z.optional(z.string()),
  tls: SingboxOutboundCommonTlsSchema
});

export const SingboxOutboundSelectorSchema = z.object({
  type: z.literal("selector"),
  tag: z.string(),
  outbounds: z.array(z.string()),
  default: z.optional(z.string())
});

// Simple outbound types (no server/port required)
export const SingboxOutboundDirectSchema = z.object({
  type: z.literal("direct"),
  tag: z.string()
});

export const SingboxOutboundDnsSchema = z.object({
  type: z.literal("dns"),
  tag: z.string()
});

export const SingboxOutboundBlockSchema = z.object({
  type: z.literal("block"),
  tag: z.string()
});

export const SingboxOutboundSocksSchema = SingboxOutboundSchema.extend({
  type: z.literal("socks"),
  username: z.optional(z.string()),
  password: z.optional(z.string())
});

export const SingboxOutboundShadowsocksSchema = SingboxOutboundSchema.extend({
  type: z.enum(["shadowsocks", "shadowtls"]),
  version: z.optional(z.number()),
  method: z.optional(z.enum([
    "2022-blake3-aes-128-gcm",
    "2022-blake3-aes-256-gcm",
    "2022-blake3-chacha20-poly1305",
    "none",
    "aes-128-gcm",
    "aes-192-gcm",
    "aes-256-gcm",
    "chacha20-ietf-poly1305",
    "xchacha20-ietf-poly1305",
    "aes-128-ctr",
    "aes-192-ctr",
    "aes-256-ctr",
    "aes-128-cfb",
    "aes-192-cfb",
    "aes-256-cfb",
    "rc4-md5",
    "chacha20-ietf",
    "xchacha20"
  ])),
  password: z.string(),
  plugin: z.optional(z.string()),
  plugin_opts: z.optional(z.string()),
  tls: z.optional(SingboxOutboundCommonTlsSchema)
});

export const SingboxOutboundTrojanSchema = SingboxOutboundSchema.extend({
  type: z.literal("trojan"),
  password: z.string(),
  tls: SingboxOutboundCommonTlsSchema
});

export const SingboxOutboundTUICSchema = SingboxOutboundSchema.extend({
  type: z.literal("tuic"),
  uuid: z.string(),
  password: z.optional(z.string()),
  congestion_control: z.optional(z.enum(["cubic", "new_reno", "bbr"])),
  udp_relay_mode: z.optional(z.enum(["native", "quic"])),
  udp_over_stream: z.optional(z.boolean()),
  zero_rtt_handshake: z.optional(z.boolean()),
  heartbeat: z.optional(z.string()),
  tls: SingboxOutboundCommonTlsSchema
});

export const SingboxOutboundVmessSchema = SingboxOutboundSchema.extend({
  type: z.literal("vmess"),
  uuid: z.string(),
  security: z.optional(z.enum(["auto", "none", "zero", "aes-128-gcm", "chacha20-poly1305"])),
  alter_id: z.optional(z.number()),
  tls: z.optional(SingboxOutboundCommonTlsSchema),
  transport: SingboxOutboundCommonVmessOrVLESSTransportSchema
});

export const SingboxOutboundVLESSSchema = SingboxOutboundSchema.extend({
  type: z.literal("vless"),
  uuid: z.string(),
  flow: z.optional(z.enum(["xtls-rprx-vision", "xtls-rprx-vision-udp443"])),
  tls: z.optional(SingboxOutboundCommonTlsSchema),
  transport: SingboxOutboundCommonVmessOrVLESSTransportSchema
});

export const SingboxOutboundsSchema = z.array(z.discriminatedUnion("type", [
  SingboxOutboundDirectSchema,
  SingboxOutboundDnsSchema,
  SingboxOutboundBlockSchema,
  SingboxOutboundHttpSchema,
  SingboxOutboundHysteriaSchema,
  SingboxOutboundHysteria2Schema,
  SingboxOutboundSelectorSchema,
  SingboxOutboundShadowsocksSchema,
  SingboxOutboundSocksSchema,
  SingboxOutboundTrojanSchema,
  SingboxOutboundTUICSchema,
  SingboxOutboundVmessSchema,
  SingboxOutboundVLESSSchema
]));

export const SingboxExperimentalSchema = z.object({
  cache_file: z.optional(z.object({
    enabled: z.optional(z.boolean()),
    path: z.optional(z.string()),
    cache_id: z.optional(z.string()),
    store_fakeip: z.optional(z.boolean()),
    store_rdrc: z.optional(z.boolean())
  })),
  clash_api: z.optional(z.object({
    external_controller: z.optional(z.string()),
    external_ui: z.optional(z.string()),
    external_ui_download_url: z.optional(z.string()),
    secret: z.optional(z.string()),
    default_mode: z.optional(z.string())
  }))
});

export const SingBoxRuleSchema = z.object({
  inbound: z.array(z.string()).optional(),
  ip_version: z.number().optional(),
  network: z.array(z.string()).optional(),
  auth_user: z.array(z.string()).optional(),
  protocol: z.array(z.string()).optional(),
  domain: z.union([z.string(), z.array(z.string())]).optional(),
  domain_suffix: z.union([z.string(), z.array(z.string())]).optional(),
  domain_keyword: z.union([z.string(), z.array(z.string())]).optional(),
  domain_regex: z.union([z.string(), z.array(z.string())]).optional(),
  geosite: z.array(z.string()).optional(),
  source_geoip: z.array(z.string()).optional(),
  geoip: z.array(z.string()).optional(),
  source_ip_cidr: z.union([z.string(), z.array(z.string())]).optional(),
  source_ip_is_private: z.boolean().optional(),
  ip_cidr: z.union([z.string(), z.array(z.string())]).optional(),
  ip_is_private: z.boolean().optional(),
  source_port: z.array(z.number()).optional(),
  source_port_range: z.array(z.string()).optional(),
  port: z.array(z.number()).optional(),
  port_range: z.array(z.string()).optional(),
  process_name: z.array(z.string()).optional(),
  process_path: z.array(z.string()).optional(),
  package_name: z.array(z.string()).optional(),
  user: z.array(z.string()).optional(),
  user_id: z.array(z.number()).optional(),
  clash_mode: z.string().optional(),
  wifi_ssid: z.array(z.string()).optional(),
  wifi_bssid: z.array(z.string()).optional(),
  rule_set: z.array(z.string()).optional(),
  rule_set_ipcidr_match_source: z.boolean().optional(),
  invert: z.boolean().optional(),
  outbound: z.string()
});

export const SingboxSchema = z.object({
  log: z.optional(z.object({
    disabled: z.optional(z.boolean()),
    level: z.optional(z.string()),
    timestamp: z.optional(z.boolean())
  })),
  dns: z.optional(z.any()),
  inbounds: z.optional(z.array(z.any())),
  experimental: z.optional(SingboxExperimentalSchema),
  outbounds: SingboxOutboundsSchema,
  route: z.optional(z.object({
    rules: z.array(SingBoxRuleSchema),
    rule_set: z.optional(z.array(z.any())),
    final: z.optional(z.string())
  }))
});

// Type exports
export type ClashProxy = z.infer<typeof ClashProxySchema>;
export type ClashProxyBaseVmessOrVLESS = z.infer<typeof ClashProxyBaseVmessOrVLESSSchema>;
export type ClashProxyHttp = z.infer<typeof ClashProxyHttpSchema>;
export type ClashProxyHysteria = z.infer<typeof ClashProxyHysteriaSchema>;
export type ClashProxyHysteria2 = z.infer<typeof ClashProxyHysteria2Schema>;
export type ClashProxyShadowsocks = z.infer<typeof ClashProxyShadowsocksSchema>;
export type ClashProxySocks5 = z.infer<typeof ClashProxySocks5Schema>;
export type ClashProxyTrojan = z.infer<typeof ClashProxyTrojanSchema>;
export type ClashProxyTUIC = z.infer<typeof ClashProxyTUICSchema>;
export type ClashProxyVmess = z.infer<typeof ClashProxyVmessSchema>;
export type ClashProxyVLESS = z.infer<typeof ClashProxyVLESSSchema>;
export type Clash = z.infer<typeof ClashSchema>;

export type SingboxOutbound = z.infer<typeof SingboxOutboundSchema>;
export type SingboxOutboundCommonTls = z.infer<typeof SingboxOutboundCommonTlsSchema>;
export type SingboxOutboundCommonVmessOrVLESSTransport = z.infer<typeof SingboxOutboundCommonVmessOrVLESSTransportSchema>;
export type SingboxOutboundHttp = z.infer<typeof SingboxOutboundHttpSchema>;
export type SingboxOutboundHysteria = z.infer<typeof SingboxOutboundHysteriaSchema>;
export type SingboxOutboundHysteria2 = z.infer<typeof SingboxOutboundHysteria2Schema>;
export type SingboxOutboundSelector = z.infer<typeof SingboxOutboundSelectorSchema>;
export type SingboxOutboundShadowsocks = z.infer<typeof SingboxOutboundShadowsocksSchema>;
export type SingboxOutboundSocks = z.infer<typeof SingboxOutboundSocksSchema>;
export type SingboxOutboundTrojan = z.infer<typeof SingboxOutboundTrojanSchema>;
export type SingboxOutboundTUIC = z.infer<typeof SingboxOutboundTUICSchema>;
export type SingboxOutboundVmess = z.infer<typeof SingboxOutboundVmessSchema>;
export type SingboxOutboundVLESS = z.infer<typeof SingboxOutboundVLESSSchema>;
export type SingboxOutbounds = z.infer<typeof SingboxOutboundsSchema>;
export type SingboxExperimental = z.infer<typeof SingboxExperimentalSchema>;
export type SingBoxRule = z.infer<typeof SingBoxRuleSchema>;
export type Singbox = z.infer<typeof SingboxSchema>;
