/**
 * 订阅解析器 - 支持 Base64 编码的代理 URL 格式
 * 支持的协议: vless://, vmess://, ss://, trojan://
 */

export interface ParsedProxy {
  name: string;
  type: string;
  server: string;
  port: number;
  [key: string]: unknown;
}

/**
 * 检测内容是否为 Base64 编码的订阅格式
 * Base64 订阅特征：解码后每行是代理 URL（如 vless://, vmess://）
 */
export function isBase64Subscription(text: string): boolean {
  // 如果看起来像 YAML（包含 proxies: 或以 port: 开头等），则不是 Base64
  const trimmed = text.trim();
  if (
    trimmed.startsWith("proxies:") ||
    trimmed.startsWith("port:") ||
    trimmed.startsWith("#") ||
    trimmed.includes("\nproxies:")
  ) {
    return false;
  }

  // 尝试 Base64 解码
  try {
    const decoded = Buffer.from(trimmed, "base64").toString("utf-8");
    // 检查解码后是否包含代理 URL 协议
    return /^(vless|vmess|ss|trojan|ssr|hysteria|hysteria2):\/\//m.test(decoded);
  } catch {
    return false;
  }
}

/**
 * 解析 Base64 编码的订阅内容
 * @param text Base64 编码的文本
 * @returns Clash 代理数组
 */
export function parseBase64Subscription(text: string): ParsedProxy[] {
  const decoded = Buffer.from(text.trim(), "base64").toString("utf-8");
  const lines = decoded.split(/\r?\n/).filter((line) => line.trim());
  const proxies: ParsedProxy[] = [];

  for (const line of lines) {
    try {
      const proxy = parseProxyUrl(line.trim());
      if (proxy) {
        proxies.push(proxy);
      }
    } catch (e) {
      // 跳过解析失败的行
      console.warn(`Failed to parse proxy URL: ${line}`, e);
    }
  }

  return proxies;
}

/**
 * 解析单个代理 URL
 */
function parseProxyUrl(url: string): ParsedProxy | null {
  if (url.startsWith("vless://")) {
    return parseVlessUrl(url);
  }
  if (url.startsWith("vmess://")) {
    return parseVmessUrl(url);
  }
  if (url.startsWith("ss://")) {
    return parseShadowsocksUrl(url);
  }
  if (url.startsWith("trojan://")) {
    return parseTrojanUrl(url);
  }
  if (url.startsWith("hysteria2://") || url.startsWith("hy2://")) {
    return parseHysteria2Url(url);
  }
  return null;
}

/**
 * 解析 VLESS URL
 * 格式: vless://uuid@server:port?params#name
 */
function parseVlessUrl(url: string): ParsedProxy | null {
  const parsed = new URL(url);
  const uuid = parsed.username;
  const server = parsed.hostname;
  const port = Number.parseInt(parsed.port, 10);
  const name = decodeURIComponent(parsed.hash.slice(1)) || `${server}:${port}`;
  const params = Object.fromEntries(parsed.searchParams.entries());

  const proxy: ParsedProxy = {
    name,
    type: "vless",
    server,
    port,
    uuid,
    udp: true
  };

  // 处理传输层
  const network = params.type || "tcp";
  if (network !== "tcp") {
    proxy.network = network;
  }

  // 处理 WebSocket
  if (network === "ws") {
    proxy["ws-opts"] = {
      path: params.path ? decodeURIComponent(params.path) : "/",
      headers: params.host ? { Host: params.host } : undefined
    };
  }

  // 处理 gRPC
  if (network === "grpc") {
    proxy["grpc-opts"] = {
      "grpc-service-name": params.serviceName || ""
    };
  }

  // 处理 TLS
  if (params.security === "tls") {
    proxy.tls = true;
    if (params.sni) {
      proxy.sni = params.sni;
    }
    if (params.fp) {
      proxy["client-fingerprint"] = params.fp;
    }
    if (params.alpn) {
      proxy.alpn = params.alpn.split(",");
    }
    if (params.insecure === "1") {
      proxy["skip-cert-verify"] = true;
    }
  }

  // 处理 Reality
  if (params.security === "reality") {
    proxy.tls = true;
    proxy["reality-opts"] = {
      "public-key": params.pbk || "",
      "short-id": params.sid || ""
    };
    if (params.sni) {
      proxy.sni = params.sni;
    }
    if (params.fp) {
      proxy["client-fingerprint"] = params.fp;
    }
  }

  // 处理 flow (XTLS)
  if (params.flow) {
    proxy.flow = params.flow;
  }

  return proxy;
}

/**
 * 解析 VMess URL
 * 格式 1: vmess://base64_json
 * 格式 2: vmess://uuid@server:port?params#name (较少见)
 */
function parseVmessUrl(url: string): ParsedProxy | null {
  const content = url.slice(8); // 移除 "vmess://"

  // 尝试 Base64 JSON 格式
  try {
    const decoded = Buffer.from(content.split("#")[0], "base64").toString("utf-8");
    const config = JSON.parse(decoded);

    const proxy: ParsedProxy = {
      name: config.ps || config.remarks || `${config.add}:${config.port}`,
      type: "vmess",
      server: config.add,
      port: Number.parseInt(String(config.port), 10),
      uuid: config.id,
      alterId: Number.parseInt(String(config.aid || 0), 10),
      cipher: config.scy || "auto",
      udp: true
    };

    // 处理传输层
    const network = config.net || "tcp";
    if (network !== "tcp") {
      proxy.network = network;
    }

    // 处理 WebSocket
    if (network === "ws") {
      proxy["ws-opts"] = {
        path: config.path || "/",
        headers: config.host ? { Host: config.host } : undefined
      };
    }

    // 处理 gRPC
    if (network === "grpc") {
      proxy["grpc-opts"] = {
        "grpc-service-name": config.path || ""
      };
    }

    // 处理 TLS
    if (config.tls === "tls") {
      proxy.tls = true;
      if (config.sni) {
        proxy.servername = config.sni;
      }
      if (config.alpn) {
        proxy.alpn = typeof config.alpn === "string" ? config.alpn.split(",") : config.alpn;
      }
      if (config.fp) {
        proxy["client-fingerprint"] = config.fp;
      }
    }

    return proxy;
  } catch {
    // 不是 Base64 JSON 格式，尝试 URL 格式
  }

  // URL 格式解析
  try {
    const parsed = new URL(url);
    const uuid = parsed.username;
    const server = parsed.hostname;
    const port = Number.parseInt(parsed.port, 10);
    const name = decodeURIComponent(parsed.hash.slice(1)) || `${server}:${port}`;

    return {
      name,
      type: "vmess",
      server,
      port,
      uuid,
      alterId: 0,
      cipher: "auto",
      udp: true
    };
  } catch {
    return null;
  }
}

/**
 * 解析 Shadowsocks URL
 * 格式 1: ss://base64(method:password)@server:port#name
 * 格式 2: ss://base64(method:password@server:port)#name
 */
function parseShadowsocksUrl(url: string): ParsedProxy | null {
  const hashIndex = url.indexOf("#");
  const name = hashIndex !== -1 ? decodeURIComponent(url.slice(hashIndex + 1)) : "";
  const mainPart = hashIndex !== -1 ? url.slice(5, hashIndex) : url.slice(5);

  // 尝试格式 1: ss://base64@server:port
  const atIndex = mainPart.lastIndexOf("@");
  if (atIndex !== -1) {
    try {
      const userInfo = mainPart.slice(0, atIndex);
      const serverPart = mainPart.slice(atIndex + 1);
      const [server, portStr] = serverPart.split(":");
      const port = Number.parseInt(portStr, 10);

      // 解码 userInfo
      const decoded = Buffer.from(userInfo, "base64").toString("utf-8");
      const colonIndex = decoded.indexOf(":");
      const method = decoded.slice(0, colonIndex);
      const password = decoded.slice(colonIndex + 1);

      return {
        name: name || `${server}:${port}`,
        type: "ss",
        server,
        port,
        cipher: method,
        password,
        udp: true
      };
    } catch {
      // 继续尝试其他格式
    }
  }

  // 尝试格式 2: ss://base64(全部内容)
  try {
    const decoded = Buffer.from(mainPart, "base64").toString("utf-8");
    const match = decoded.match(/^(.+?):(.+)@(.+):(\d+)$/);
    if (match) {
      const [, method, password, server, portStr] = match;
      return {
        name: name || `${server}:${portStr}`,
        type: "ss",
        server,
        port: Number.parseInt(portStr, 10),
        cipher: method,
        password,
        udp: true
      };
    }
  } catch {
    // 解析失败
  }

  return null;
}

/**
 * 解析 Trojan URL
 * 格式: trojan://password@server:port?params#name
 */
function parseTrojanUrl(url: string): ParsedProxy | null {
  const parsed = new URL(url);
  const password = decodeURIComponent(parsed.username);
  const server = parsed.hostname;
  const port = Number.parseInt(parsed.port, 10);
  const name = decodeURIComponent(parsed.hash.slice(1)) || `${server}:${port}`;
  const params = Object.fromEntries(parsed.searchParams.entries());

  const proxy: ParsedProxy = {
    name,
    type: "trojan",
    server,
    port,
    password,
    udp: true
  };

  // 处理 SNI
  if (params.sni) {
    proxy.sni = params.sni;
  }

  // 处理 ALPN
  if (params.alpn) {
    proxy.alpn = params.alpn.split(",");
  }

  // 处理指纹
  if (params.fp) {
    proxy["client-fingerprint"] = params.fp;
  }

  // 跳过证书验证
  if (params.allowInsecure === "1" || params.insecure === "1") {
    proxy["skip-cert-verify"] = true;
  }

  // 处理传输层
  const network = params.type || "tcp";
  if (network === "ws") {
    proxy.network = "ws";
    proxy["ws-opts"] = {
      path: params.path ? decodeURIComponent(params.path) : "/",
      headers: params.host ? { Host: params.host } : undefined
    };
  }

  if (network === "grpc") {
    proxy.network = "grpc";
    proxy["grpc-opts"] = {
      "grpc-service-name": params.serviceName || ""
    };
  }

  return proxy;
}

/**
 * 解析 Hysteria2 URL
 * 格式: hysteria2://password@server:port?params#name
 * 或: hy2://password@server:port?params#name
 */
function parseHysteria2Url(url: string): ParsedProxy | null {
  const parsed = new URL(url);
  const password = decodeURIComponent(parsed.username);
  const server = parsed.hostname;
  const port = Number.parseInt(parsed.port, 10);
  const name = decodeURIComponent(parsed.hash.slice(1)) || `${server}:${port}`;
  const params = Object.fromEntries(parsed.searchParams.entries());

  const proxy: ParsedProxy = {
    name,
    type: "hysteria2",
    server,
    port,
    password
  };

  // 处理 SNI
  if (params.sni) {
    proxy.sni = params.sni;
  }

  // 处理混淆
  if (params.obfs && params["obfs-password"]) {
    proxy.obfs = params.obfs;
    proxy["obfs-password"] = params["obfs-password"];
  }

  // 跳过证书验证
  if (params.insecure === "1") {
    proxy["skip-cert-verify"] = true;
  }

  // 处理 ALPN
  if (params.alpn) {
    proxy.alpn = params.alpn.split(",");
  }

  return proxy;
}
