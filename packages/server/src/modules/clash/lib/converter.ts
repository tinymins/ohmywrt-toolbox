import * as yaml from "yaml";
import {
  type Clash,
  ClashSchema,
  type ClashProxyBaseVmessOrVLESS,
  type ClashProxyHttp,
  type ClashProxyHysteria,
  type ClashProxyHysteria2,
  type ClashProxyShadowsocks,
  type ClashProxySocks5,
  type ClashProxyTrojan,
  type ClashProxyTUIC,
  type ClashProxyVmess,
  type ClashProxyVLESS,
  type SingboxOutboundCommonVmessOrVLESSTransport,
  type SingboxOutboundHttp,
  type SingboxOutboundHysteria,
  type SingboxOutboundHysteria2,
  type SingboxOutboundShadowsocks,
  type SingboxOutboundSocks,
  type SingboxOutboundTrojan,
  type SingboxOutboundTUIC,
  type SingboxOutboundVmess,
  type SingboxOutboundVLESS,
  type SingboxOutbounds
} from "./types";

/**
 * 将 Clash 配置转换为 Sing-box outbounds
 */
export function convertClashToSingbox(input: string | object): SingboxOutbounds {
  let clash: Clash;
  try {
    clash = ClashSchema.parse(typeof input === "string" ? yaml.parse(input) : input);
  } catch (e) {
    // 如果验证失败，尝试直接使用 proxies 数组
    const rawData = typeof input === "string" ? yaml.parse(input) : input;
    if (rawData?.proxies && Array.isArray(rawData.proxies)) {
      clash = { proxies: rawData.proxies };
    } else {
      return [];
    }
  }

  const outbounds: SingboxOutbounds = [];

  for (const proxy of clash.proxies) {
    let convertedOutbound;

    switch (proxy.type) {
      case "http":
        convertedOutbound = convertHttp(proxy);
        break;
      case "hysteria":
        convertedOutbound = convertHysteria(proxy);
        break;
      case "hysteria2":
        convertedOutbound = convertHysteria2(proxy);
        break;
      case "ss":
        convertedOutbound = convertShadowsocks(proxy);
        break;
      case "socks5":
        convertedOutbound = convertSocks5ToSocks(proxy);
        break;
      case "trojan":
        convertedOutbound = convertTrojan(proxy);
        break;
      case "tuic":
        convertedOutbound = convertTUIC(proxy);
        break;
      case "vmess":
        convertedOutbound = convertVmess(proxy);
        break;
      case "vless":
        convertedOutbound = convertVLESS(proxy);
        break;
      default:
        continue;
    }

    if (convertedOutbound !== null) {
      outbounds.push(convertedOutbound);
    }
  }

  return outbounds;
}

const convertVmessOrVLESSTransport = (
  proxy: ClashProxyBaseVmessOrVLESS
): SingboxOutboundCommonVmessOrVLESSTransport | undefined => {
  if (proxy["http-opts"] !== undefined) {
    const transport: SingboxOutboundCommonVmessOrVLESSTransport = {
      type: "http"
    };
    if (proxy["http-opts"].path !== undefined) {
      transport.path = proxy["http-opts"].path[0]!;
    }
    if (proxy["http-opts"].method !== undefined) {
      transport.method = proxy["http-opts"].method!;
    }
    if (proxy["http-opts"].headers !== undefined) {
      transport.headers = {};
      for (const [key, value] of Object.entries(proxy["http-opts"].headers!)) {
        transport.headers[key] = (value as string[])[0];
      }
    }
    return transport;
  }
  if (proxy["h2-opts"] !== undefined) {
    const transport: SingboxOutboundCommonVmessOrVLESSTransport = {
      type: "http"
    };
    if (proxy["h2-opts"].host !== undefined) {
      transport.host = proxy["h2-opts"].host!;
    }
    if (proxy["h2-opts"].path !== undefined) {
      transport.path = proxy["h2-opts"].path!;
    }
    return transport;
  }
  if (proxy["ws-opts"] !== undefined) {
    const transport: SingboxOutboundCommonVmessOrVLESSTransport = {
      type: "ws"
    };
    if (proxy["ws-opts"].path !== undefined) {
      transport.path = proxy["ws-opts"].path!;
    }
    if (proxy["ws-opts"].headers !== undefined) {
      transport.headers = proxy["ws-opts"].headers;
      if (proxy["ws-opts"]["max-early-data"] !== undefined) {
        transport.max_early_data = proxy["ws-opts"]["max-early-data"]!;
      }
      if (proxy["ws-opts"]["early-data-header-name"] !== undefined) {
        transport.early_data_header_name = proxy["ws-opts"]["early-data-header-name"]!;
      }
    }
    return transport;
  }
  if (proxy["grpc-opts"] !== undefined) {
    const transport: SingboxOutboundCommonVmessOrVLESSTransport = {
      type: "grpc"
    };
    if (proxy["grpc-opts"]["grpc-service-name"] !== undefined) {
      transport.service_name = proxy["grpc-opts"]["grpc-service-name"]!;
    }
    return transport;
  }
  // 无 transport 选项时返回 undefined，表示使用默认 TCP
  return undefined;
};

const convertHttp = (proxy: ClashProxyHttp): SingboxOutboundHttp => {
  const outbound: SingboxOutboundHttp = {
    type: "http",
    tag: proxy.name,
    server: proxy.server,
    server_port: proxy.port
  };

  if (proxy.username !== undefined) {
    outbound.username = proxy.username!;
    if (proxy.password !== undefined) {
      outbound.password = proxy.password!;
    }
  }
  if (proxy.tls !== undefined && proxy.tls === true) {
    outbound.tls = { enabled: true };
    if (proxy["skip-cert-verify"] !== undefined && proxy["skip-cert-verify"] === true) {
      outbound.tls.insecure = true;
    }
    if (proxy.sni !== undefined) {
      outbound.tls.server_name = proxy.sni!;
    }
  }

  return outbound;
};

const convertHysteria = (proxy: ClashProxyHysteria): SingboxOutboundHysteria => {
  const outbound: SingboxOutboundHysteria = {
    type: "hysteria",
    tag: proxy.name,
    server: proxy.server,
    server_port: proxy.port,
    up: proxy.up,
    down: proxy.down,
    tls: { enabled: true }
  };

  if (proxy.protocol !== undefined && proxy.protocol !== "udp") {
    throw new Error("Unsupported protocol faketcp or wechat-video");
  }
  if (proxy.sni !== undefined) {
    outbound.tls.server_name = proxy.sni!;
  } else {
    outbound.tls.server_name = proxy.server;
  }
  if (proxy.alpn !== undefined) {
    outbound.tls.alpn = proxy.alpn!;
  }
  if (proxy["skip-cert-verify"] !== undefined && proxy["skip-cert-verify"] === true) {
    outbound.tls.insecure = true;
  }
  if (proxy.obfs !== undefined) {
    outbound.obfs = proxy.obfs!;
  }
  if (proxy["auth-str"] !== undefined) {
    outbound.auth_str = proxy["auth-str"]!;
  }

  return outbound;
};

const convertHysteria2 = (proxy: ClashProxyHysteria2): SingboxOutboundHysteria2 => {
  const outbound: SingboxOutboundHysteria2 = {
    type: "hysteria2",
    tag: proxy.name,
    server: proxy.server,
    server_port: proxy.port,
    password: proxy.password,
    tls: {
      enabled: true
    }
  };

  if (proxy.sni !== undefined) {
    outbound.tls.server_name = proxy.sni!;
  } else {
    outbound.tls.server_name = proxy.server;
  }

  if (proxy["skip-cert-verify"] !== undefined && proxy["skip-cert-verify"] === true) {
    outbound.tls.insecure = true;
  }

  return outbound;
};

const convertShadowsocks = (proxy: ClashProxyShadowsocks): SingboxOutboundShadowsocks => {
  const outbound: SingboxOutboundShadowsocks = {
    type: "shadowsocks",
    tag: proxy.name,
    server: proxy.server,
    server_port: proxy.port,
    method: proxy.cipher,
    password: proxy.password
  };

  if (proxy.udp !== undefined && proxy.udp === false) {
    outbound.network = "tcp";
  }
  if (proxy.plugin !== undefined) {
    if (proxy.plugin === "shadow-tls") {
      if (proxy["plugin-opts"]) {
        outbound.tls = {
          enabled: true,
          server_name: proxy["plugin-opts"].host
        };
        outbound.type = "shadowtls";
        outbound.password = proxy["plugin-opts"].password!;
        outbound.version = proxy["plugin-opts"].version!;
        outbound.method = undefined;
      }
    } else {
      if (proxy.plugin === "obfs") {
        outbound.plugin = "obfs-local";
      } else {
        outbound.plugin = proxy.plugin!;
      }
      outbound.plugin_opts = "";
      if (proxy["plugin-opts"] !== undefined) {
        outbound.plugin_opts += `mode=${proxy["plugin-opts"].mode!}`;
        if (proxy["plugin-opts"].host !== undefined) {
          outbound.plugin_opts += `;host=${proxy["plugin-opts"].host!}`;
        }
        if (proxy.plugin === "v2ray-plugin") {
          if (proxy["plugin-opts"].tls !== undefined && proxy["plugin-opts"].tls === true) {
            outbound.plugin_opts += ";tls";
          }
          if (proxy["plugin-opts"].path !== undefined) {
            outbound.plugin_opts += `;path=${proxy["plugin-opts"].path!}`;
          }
          if (proxy["plugin-opts"].mux !== undefined) {
            outbound.plugin_opts += `;mux=${proxy["plugin-opts"].mux!}`;
          }
        }
      }
    }
  }

  return outbound;
};

const convertSocks5ToSocks = (proxy: ClashProxySocks5): SingboxOutboundSocks => {
  const outbound: SingboxOutboundSocks = {
    type: "socks",
    tag: proxy.name,
    server: proxy.server,
    server_port: proxy.port
  };

  if (proxy.udp !== undefined && proxy.udp === false) {
    outbound.network = "tcp";
  }
  if (proxy.username !== undefined) {
    outbound.username = proxy.username!;
    if (proxy.password !== undefined) {
      outbound.password = proxy.password!;
    }
  }
  if (proxy.tls !== undefined && proxy.tls === true) {
    throw new Error("Unsupported layer tls");
  }

  return outbound;
};

const convertTrojan = (proxy: ClashProxyTrojan): SingboxOutboundTrojan => {
  const outbound: SingboxOutboundTrojan = {
    type: "trojan",
    tag: proxy.name,
    server: proxy.server,
    server_port: proxy.port,
    password: proxy.password,
    tls: { enabled: true },
    multiplex: proxy.multiplex ? {
      enabled: true,
      protocol: "h2mux",
      max_connections: 8,
      min_streams: 16,
      padding: true,
      brutal: {
        enabled: true,
        up_mbps: 1000,
        down_mbps: 1000
      }
    } : undefined
  };

  if (proxy.udp !== undefined && proxy.udp === false) {
    outbound.network = "tcp";
  }
  if (proxy.sni !== undefined) {
    outbound.tls!.server_name = proxy.sni!;
  }
  if (proxy["skip-cert-verify"] !== undefined && proxy["skip-cert-verify"] === true) {
    outbound.tls!.insecure = true;
  }
  if (proxy.alpn !== undefined) {
    outbound.tls!.alpn = proxy.alpn!;
  }
  if (proxy["client-fingerprint"]) {
    outbound.tls!.utls = {
      enabled: true,
      fingerprint: proxy["client-fingerprint"]
    };
  }

  return outbound;
};

const convertTUIC = (proxy: ClashProxyTUIC): SingboxOutboundTUIC => {
  const outbound: SingboxOutboundTUIC = {
    type: "tuic",
    tag: proxy.name,
    server: proxy.server,
    server_port: proxy.port,
    uuid: proxy.uuid,
    tls: { enabled: true }
  };

  if (proxy.password !== undefined) {
    outbound.password = proxy.password;
  }
  if (proxy["heartbeat-interval"] !== undefined) {
    outbound.heartbeat = `${(proxy["heartbeat-interval"] / 1000).toString()}s`;
  }
  if (proxy["reduce-rtt"] !== undefined && proxy["reduce-rtt"] === true) {
    outbound.zero_rtt_handshake = true;
  }
  if (proxy["udp-relay-mode"] !== undefined) {
    outbound.udp_relay_mode = proxy["udp-relay-mode"];
  }
  if (proxy["congestion-controller"] !== undefined) {
    outbound.congestion_control = proxy["congestion-controller"];
  }
  if (proxy["udp-over-stream"] !== undefined && proxy["udp-over-stream"] === true) {
    outbound.udp_over_stream = true;
  }
  if (proxy.sni !== undefined) {
    outbound.tls!.server_name = proxy.sni!;
  }
  if (proxy["skip-cert-verify"] !== undefined && proxy["skip-cert-verify"] === true) {
    outbound.tls!.insecure = true;
  }
  if (proxy.alpn !== undefined) {
    outbound.tls!.alpn = proxy.alpn!;
  }

  return outbound;
};

const convertVmess = (proxy: ClashProxyVmess): SingboxOutboundVmess => {
  const transport = convertVmessOrVLESSTransport(proxy);

  const outbound: SingboxOutboundVmess = {
    type: "vmess",
    tag: proxy.name,
    server: proxy.server,
    server_port: proxy.port,
    uuid: proxy.uuid,
    security: proxy.cipher,
    alter_id: proxy.alterId,
    transport,
    multiplex: proxy.multiplex ? {
      enabled: true,
      protocol: "h2mux",
      max_connections: 8,
      min_streams: 16,
      padding: true
    } : undefined
  };

  if (proxy.udp !== undefined && proxy.udp === false) {
    outbound.network = "tcp";
  }
  if (proxy.tls !== undefined && proxy.tls === true) {
    outbound.tls = { enabled: true };
    if (proxy.servername !== undefined) {
      outbound.tls.server_name = proxy.servername!;
    }
    if (proxy["skip-cert-verify"] !== undefined && proxy["skip-cert-verify"] === true) {
      outbound.tls.insecure = true;
    }
  }
  return outbound;
};

const convertVLESS = (proxy: ClashProxyVLESS): SingboxOutboundVLESS => {
  const transport = convertVmessOrVLESSTransport(proxy);

  const outbound: SingboxOutboundVLESS = {
    type: "vless",
    tag: proxy.name,
    server: proxy.server,
    server_port: proxy.port,
    uuid: proxy.uuid,
    transport,
    multiplex: proxy.multiplex ? {
      enabled: true,
      protocol: "h2mux",
      max_connections: 8,
      min_streams: 16,
      padding: true
    } : undefined
  };

  if (proxy.flow) {
    outbound.flow = proxy.flow;
  }
  if (proxy.udp !== undefined && proxy.udp === false) {
    outbound.network = "tcp";
  }
  if (proxy.tls !== undefined && proxy.tls === true) {
    outbound.tls = { enabled: true };
    if (proxy.servername !== undefined) {
      outbound.tls.server_name = proxy.servername!;
    }
    if (proxy["skip-cert-verify"] !== undefined && proxy["skip-cert-verify"] === true) {
      outbound.tls.insecure = true;
    }
    if (proxy["client-fingerprint"]) {
      outbound.tls.utls = {
        enabled: true,
        fingerprint: proxy["client-fingerprint"]
      };
    }
    if (proxy["reality-opts"]) {
      outbound.tls.reality = {
        enabled: true,
        public_key: proxy["reality-opts"]["public-key"],
        short_id: proxy["reality-opts"]["short-id"]
      };
    }
  }

  return outbound;
};
