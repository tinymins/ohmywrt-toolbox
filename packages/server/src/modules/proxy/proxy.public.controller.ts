import type { ProxyGroup, ProxyRuleProvidersList } from "@acme/types";
import {
  BadRequestException,
  Controller,
  Get,
  Logger,
  NotFoundException,
  Param,
  Query,
  Req,
  Res,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { parse as parseJsonc } from "jsonc-parser";
import * as yaml from "yaml";
import {
  DEFAULT_GROUPS,
  DEFAULT_RULE_PROVIDERS,
  SB_DEFAULT_GROUPS,
} from "./lib/config";
import { convertClashToSingbox } from "./lib/converter";
import {
  isBase64Subscription,
  parseBase64Subscription,
} from "./lib/subscription-parser";
import type { SingBoxRule, Singbox } from "./lib/types";
import { subscriptionCache } from "./lib/subscription-cache";
import { proxySubscribeService } from "./proxy.service";

/** 安全解析 JSONC 字符串 */
const safeParseJsonc = <T>(jsonc: string | null, defaultValue: T): T => {
  if (!jsonc) return defaultValue;
  try {
    return parseJsonc(jsonc) ?? defaultValue;
  } catch {
    return defaultValue;
  }
};

@Controller("public")
export class ProxyPublicController {
  private readonly logger = new Logger(ProxyPublicController.name);

  /**
   * 获取订阅的代理列表（公共逻辑）
   * @param uuid 订阅 UUID
   * @param excludeTypes 要排除的代理类型（如 Sing-box 不支持 SSR）
   */
  private async fetchProxies(uuid: string, excludeTypes: string[] = []) {
    const subscribe = await proxySubscribeService.getByUrl(uuid);
    if (!subscribe) {
      throw new NotFoundException("订阅不存在");
    }

    const proxies: any[] = [];

    // 解析附加的服务器配置（从 JSONC 字符串解析）
    const servers = safeParseJsonc<unknown[]>(subscribe.servers, []);
    for (const item of servers) {
      if (typeof item === "string") {
        proxies.push(yaml.parse(item));
      } else {
        proxies.push(item);
      }
    }

    // 获取远程订阅（优先 subscribeItems，回退 subscribeUrl）
    const effectiveUrls =
      proxySubscribeService.getEffectiveSubscribeUrls(subscribe);
    const filters = safeParseJsonc<string[]>(subscribe.filter, []);

    if (effectiveUrls.length > 0) {
      const results = await Promise.all(
        effectiveUrls.map(
          async ({ url, prefix, cacheTtlMinutes: itemCacheTtl }) => {
            try {
              // 检查缓存（使用每个订阅源自己的缓存时间）
              const cacheTtl = itemCacheTtl ?? null;
              const cached = subscriptionCache.get(url, cacheTtl);
              let text: string;
              if (cached) {
                text = cached.text;
              } else {
                const response = await fetch(url);
                text = await response.text();
                // 写入缓存
                if (cacheTtl && cacheTtl > 0) {
                  subscriptionCache.set(url, {
                    text,
                    headers: {},
                    status: response.status,
                  });
                }
              }
              // 支持 Base64 编码的订阅格式
              let parsed: any;
              if (isBase64Subscription(text)) {
                parsed = { proxies: parseBase64Subscription(text) };
              } else {
                parsed = yaml.parse(text);
              }
              return { parsed, prefix };
            } catch (e) {
              this.logger.warn(`Failed to fetch subscription: ${url}`, e);
              return null;
            }
          },
        ),
      );

      for (const item of results) {
        if (item?.parsed?.proxies) {
          // 拼接前缀到节点名称
          if (item.prefix) {
            for (const p of item.parsed.proxies) {
              if (p.name) p.name = `${item.prefix}${p.name}`;
            }
          }
          let filtered = item.parsed.proxies.filter(
            (p: any) => !filters.some((f) => p.name?.includes(f)),
          );
          // 排除指定类型
          if (excludeTypes.length > 0) {
            filtered = filtered.filter(
              (p: any) => !excludeTypes.includes(p.type),
            );
          }
          proxies.push(...filtered);
        }
      }
    }

    // 添加国旗图标
    for (const proxy of proxies) {
      proxy.name = proxySubscribeService.appendIcon(proxy.name);
    }

    const nodes = proxies.map((item) => item.name).filter(Boolean);

    return { subscribe, proxies, nodes };
  }

  /**
   * 构建 Clash 系列配置的公共数据（Clash 和 Clash Meta 共用）
   */
  private buildClashBase(
    subscribe: Awaited<ReturnType<typeof proxySubscribeService.getByUrl>> &
      object,
    proxies: any[],
    nodes: string[],
  ) {
    // 构建规则（从 JSONC 字符串解析）
    const ruleSet: string[] = [];
    const ruleProviders: Record<string, any> = {};
    const rawRuleList = safeParseJsonc<ProxyRuleProvidersList>(
      subscribe.ruleList,
      {},
    );
    const ruleProvidersList =
      rawRuleList && Object.keys(rawRuleList).length > 0
        ? rawRuleList
        : DEFAULT_RULE_PROVIDERS;

    for (const [key, items] of Object.entries(ruleProvidersList)) {
      for (const item of items) {
        ruleSet.push(`RULE-SET,${item.name},${key}`);
        ruleProviders[item.name] = {
          type: "http",
          behavior: item.type ?? "classical",
          url: item.url,
          path: `./rules/${item.name}`,
          interval: 86400,
        };
      }
    }

    const rawGroups = safeParseJsonc<ProxyGroup[]>(subscribe.group, []);
    const groups =
      rawGroups && rawGroups.length > 0 ? rawGroups : DEFAULT_GROUPS;
    const customConfig = safeParseJsonc<string[]>(subscribe.customConfig, []);

    const rules = [
      ...customConfig.filter((item) => typeof item === "string"),
      ...ruleSet,
      "DOMAIN-SUFFIX,local,DIRECT",
      "GEOIP,LAN,DIRECT,no-resolve",
      "GEOIP,CN,DIRECT,no-resolve",
      "MATCH,⚓️ 其他流量",
    ];

    const proxyGroups = groups.map((item) => {
      if (item.readonly) {
        return {
          name: item.name,
          type: item.type,
          proxies: item.proxies,
        };
      }
      return {
        name: item.name,
        type: item.type,
        proxies: [...item.proxies, ...nodes],
      };
    });

    return { ruleProviders, rules, proxyGroups };
  }

  /** 获取客户端 IP 和 User-Agent */
  private getClientInfo(req: Request) {
    const clientIp =
      (req.headers["x-forwarded-for"] as string | undefined)
        ?.split(",")[0]
        ?.trim() ||
      req.socket?.remoteAddress ||
      undefined;
    const userAgent = req.get("user-agent") || undefined;
    return { clientIp, userAgent };
  }

  /** 发送 Clash YAML 响应 */
  private sendClashYaml(res: Response, data: Record<string, any>) {
    res.setHeader("content-type", "text/plain; charset=utf-8");
    res.send(`
#---------------------------------------------------#
## Update: ${new Date().toString()}
#---------------------------------------------------#
${yaml.stringify(data)}`);
  }

  /** 生成 Clash 订阅配置 (YAML) */
  @Get("proxy/clash/:uuid")
  async getClashConfig(
    @Param("uuid") uuid: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const { subscribe, proxies, nodes } = await this.fetchProxies(uuid);
    const { ruleProviders, rules, proxyGroups } = this.buildClashBase(
      subscribe,
      proxies,
      nodes,
    );

    const data = {
      "tproxy-port": 7893,
      "allow-lan": true,
      mode: "Rule",
      "log-level": "info",
      secret: "123456",
      proxies,
      "proxy-groups": proxyGroups,
      "rule-providers": ruleProviders,
      rules,
      profile: {
        "store-selected": true,
        "store-fake-ip": true,
        tracing: true,
      },
    };

    const { clientIp, userAgent } = this.getClientInfo(req);
    await proxySubscribeService.updateAccessInfo(
      subscribe.id,
      proxies.length,
      "clash",
      clientIp,
      userAgent,
    );

    this.sendClashYaml(res, data);
  }

  /** 生成 Clash Meta (mihomo) 订阅配置 (YAML) */
  @Get("proxy/clash-meta/:uuid")
  async getClashMetaConfig(
    @Param("uuid") uuid: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const { subscribe, proxies, nodes } = await this.fetchProxies(uuid);
    const { ruleProviders, rules, proxyGroups } = this.buildClashBase(
      subscribe,
      proxies,
      nodes,
    );

    const data = {
      "tproxy-port": 7893,
      "allow-lan": true,
      mode: "Rule",
      "log-level": "info",
      secret: "123456",
      "unified-delay": true,
      "tcp-concurrent": true,
      "find-process-mode": "strict",
      "global-client-fingerprint": "chrome",
      "geodata-mode": true,
      "geo-auto-update": true,
      "geo-update-interval": 24,
      sniffer: {
        enable: true,
        "force-dns-mapping": true,
        "parse-pure-ip": true,
        "override-destination": true,
        sniff: {
          HTTP: { ports: [80, "8080-8880"], "override-destination": true },
          TLS: { ports: [443, 8443] },
          QUIC: { ports: [443, 8443] },
        },
      },
      proxies,
      "proxy-groups": proxyGroups,
      "rule-providers": ruleProviders,
      rules,
      profile: {
        "store-selected": true,
        "store-fake-ip": true,
        tracing: true,
      },
    };

    const { clientIp, userAgent } = this.getClientInfo(req);
    await proxySubscribeService.updateAccessInfo(
      subscribe.id,
      proxies.length,
      "clash-meta",
      clientIp,
      userAgent,
    );

    this.sendClashYaml(res, data);
  }

  /** 获取公网服务器地址 */
  private getPublicServerUrl(req: Request): string {
    let publicServerUrl = process.env.PUBLIC_SERVER_URL;
    if (!publicServerUrl) {
      const forwardedProto = req.headers["x-forwarded-proto"] as
        | string
        | undefined;
      const forwardedPort = req.headers["x-forwarded-port"] as
        | string
        | undefined;
      const hostHeader = req.get("host") || "localhost:4000";
      let host = hostHeader;
      if (forwardedPort && forwardedPort !== "80" && forwardedPort !== "443") {
        host = `${hostHeader.split(":")[0]}:${forwardedPort}`;
      }
      const protocol = forwardedProto || (req.secure ? "https" : "http");
      publicServerUrl = `${protocol}://${host}`;
    }
    return publicServerUrl;
  }

  /** 构建 sing-box 1.11 格式配置 */
  private buildSingboxV11(
    proxies: any[],
    nodes: string[],
    groups: ProxyGroup[],
    _ruleProvidersList: ProxyRuleProvidersList,
    ruleProviders: any[],
    publicServerUrl: string,
  ): Singbox {
    const select = groups.map((item) => {
      const outbounds = item.readonly
        ? item.proxies
        : [...item.proxies, ...nodes];
      return {
        type: "selector" as const,
        tag: item.name,
        outbounds,
        default: outbounds[0],
        interrupt_exist_connections: true,
      };
    });

    return {
      log: {
        disabled: false,
        level: "info",
        timestamp: true,
      },
      dns: {
        disable_cache: false,
        servers: [
          { tag: "local", address: "127.0.0.1", detour: "🚀 直接连接" },
          { tag: "fakeip", address: "fakeip", strategy: "ipv4_only" },
          {
            tag: "local_v4",
            address: "127.0.0.1",
            strategy: "ipv4_only",
            detour: "🚀 直接连接",
          },
        ],
        rules: [
          { query_type: ["HTTPS"], action: "reject" },
          {
            ip_cidr: [
              "127.0.0.0/8",
              "10.0.0.0/8",
              "172.16.0.0/12",
              "192.168.0.0/16",
            ],
            server: "local",
          },
          { rule_set: ["geosite-cn"], server: "local" },
          {
            type: "logical",
            mode: "and",
            rules: [
              { rule_set: ["geoip-cn"] },
              { rule_set: ["geoip-hk"], invert: true },
              { rule_set: ["geoip-gfwblack"], invert: true },
            ],
            server: "local",
          },
          {
            disable_cache: false,
            rewrite_ttl: 300,
            query_type: ["A", "AAAA"],
            server: "fakeip",
          },
        ],
        disable_expire: false,
        independent_cache: false,
        reverse_mapping: false,
        fakeip: {
          enabled: true,
          inet4_range: "198.18.0.0/15",
          inet6_range: "fc00::/18",
        },
      },
      inbounds: [
        {
          type: "direct",
          tag: "dns-in",
          listen: "::",
          sniff: true,
          listen_port: 1053,
        },
        {
          type: "tproxy",
          listen: "::",
          listen_port: 7893,
          tcp_multi_path: false,
          tcp_fast_open: true,
          udp_fragment: true,
          sniff: true,
          sniff_override_destination: false,
        },
      ],
      outbounds: [
        { type: "direct", tag: "🚀 直接连接" },
        { tag: "dns-out", type: "dns" },
        { type: "block", tag: "reject" },
        ...convertClashToSingbox({ proxies }),
        ...select,
      ],
      route: {
        rules: [
          { outbound: "dns-out", inbound: ["dns-in"], protocol: "dns" },
          {
            outbound: "🚀 直接连接",
            rule_set: ["geoip-cn", "geosite-cn"],
            ip_is_private: true,
          },
        ],
        rule_set: [
          ...ruleProviders,
          {
            tag: "geoip-cn",
            type: "remote",
            format: "binary",
            url: "https://cdn.jsdelivr.net/gh/SagerNet/sing-geoip@rule-set/geoip-cn.srs",
            download_detour: "🚀 直接连接",
          },
          {
            tag: "geoip-hk",
            type: "remote",
            format: "binary",
            url: "https://cdn.jsdelivr.net/gh/SagerNet/sing-geoip@rule-set/geoip-hk.srs",
            download_detour: "🚀 直接连接",
          },
          {
            tag: "geosite-openai",
            type: "remote",
            format: "binary",
            url: "https://cdn.jsdelivr.net/gh/SagerNet/sing-geosite@rule-set/geosite-openai.srs",
            download_detour: "🚀 直接连接",
          },
          {
            tag: "geosite-cn",
            type: "remote",
            format: "binary",
            url: "https://cdn.jsdelivr.net/gh/SagerNet/sing-geosite@rule-set/geosite-cn.srs",
            download_detour: "🚀 直接连接",
          },
          {
            tag: "geoip-gfwblack",
            type: "remote",
            url: `${publicServerUrl}/public/proxy/sing-box/convert/rule?url=${encodeURIComponent("https://cdn.jsdelivr.net/gh/ohmywrt/clash-rule@master/gfwip.yaml")}`,
            format: "source",
            download_detour: "🚀 直接连接",
          },
        ],
        final: "⚓️ 其他流量",
      },
      experimental: {
        cache_file: {
          enabled: true,
          store_fakeip: true,
          store_rdrc: false,
        },
        clash_api: {
          external_controller: "0.0.0.0:9999",
          external_ui: "/etc/sb/ui",
          external_ui_download_url:
            "https://gh-proxy.org/https://github.com/MetaCubeX/metacubexd/archive/refs/heads/gh-pages.zip",
          secret: "123456",
          default_mode: "rule",
        },
      },
    };
  }

  /** 构建 sing-box 1.12 格式配置（使用新 DNS 格式、rule action 替代 block/dns outbound） */
  private buildSingboxV12(
    proxies: any[],
    nodes: string[],
    groups: ProxyGroup[],
    _ruleProvidersList: ProxyRuleProvidersList,
    ruleProviders: any[],
    publicServerUrl: string,
  ): any {
    // v1.12 中 block outbound 已 deprecated（1.14 移除），但仍可用
    // 保留 reject outbound 让用户可在 selector 中手动切换
    // 需要将 REJECT/DIRECT 等 Clash 关键字统一映射为 sing-box tag
    const singboxKeywordMap: Record<string, string> = {
      REJECT: "reject",
      DIRECT: "🚀 直接连接",
    };
    const normalizeProxy = (p: string) => singboxKeywordMap[p] ?? p;

    const select = groups.map((item) => {
      const mappedProxies = item.proxies.map(normalizeProxy);
      const outbounds = item.readonly
        ? mappedProxies
        : [...mappedProxies, ...nodes];
      return {
        type: "selector" as const,
        tag: item.name,
        outbounds,
        default: outbounds[0],
        interrupt_exist_connections: true,
      };
    });

    return {
      log: {
        disabled: false,
        level: "info",
        timestamp: true,
      },
      dns: {
        servers: [
          { type: "local", tag: "local" },
          {
            type: "fakeip",
            tag: "fakeip",
            inet4_range: "198.18.0.0/15",
            inet6_range: "fc00::/18",
          },
          {
            type: "udp",
            tag: "local_v4",
            server: "127.0.0.1",
            server_port: 53,
          },
        ],
        rules: [
          { query_type: ["HTTPS"], action: "reject" },
          {
            ip_cidr: [
              "127.0.0.0/8",
              "10.0.0.0/8",
              "172.16.0.0/12",
              "192.168.0.0/16",
            ],
            action: "route",
            server: "local",
          },
          { rule_set: ["geosite-cn"], action: "route", server: "local" },
          {
            type: "logical",
            mode: "and",
            rules: [
              { rule_set: ["geoip-cn"] },
              { rule_set: ["geoip-hk"], invert: true },
              { rule_set: ["geoip-gfwblack"], invert: true },
            ],
            action: "route",
            server: "local",
          },
          {
            disable_cache: false,
            rewrite_ttl: 300,
            query_type: ["A", "AAAA"],
            action: "route",
            server: "fakeip",
          },
        ],
        independent_cache: false,
      },
      inbounds: [
        {
          type: "direct",
          tag: "dns-in",
          listen: "::",
          listen_port: 1053,
        },
        {
          type: "tproxy",
          listen: "::",
          listen_port: 7893,
          tcp_multi_path: false,
          tcp_fast_open: true,
          udp_fragment: true,
        },
      ],
      outbounds: [
        { type: "direct", tag: "🚀 直接连接" },
        { type: "block", tag: "reject" },
        ...convertClashToSingbox({ proxies }),
        ...select,
      ],
      route: {
        default_domain_resolver: "local",
        rules: [
          {
            action: "route",
            outbound: "🚀 直接连接",
            rule_set: ["geoip-cn", "geosite-cn"],
            ip_is_private: true,
          },
        ],
        rule_set: [
          ...ruleProviders,
          {
            tag: "geoip-cn",
            type: "remote",
            format: "binary",
            url: "https://cdn.jsdelivr.net/gh/SagerNet/sing-geoip@rule-set/geoip-cn.srs",
            download_detour: "🚀 直接连接",
          },
          {
            tag: "geoip-hk",
            type: "remote",
            format: "binary",
            url: "https://cdn.jsdelivr.net/gh/SagerNet/sing-geoip@rule-set/geoip-hk.srs",
            download_detour: "🚀 直接连接",
          },
          {
            tag: "geosite-openai",
            type: "remote",
            format: "binary",
            url: "https://cdn.jsdelivr.net/gh/SagerNet/sing-geosite@rule-set/geosite-openai.srs",
            download_detour: "🚀 直接连接",
          },
          {
            tag: "geosite-cn",
            type: "remote",
            format: "binary",
            url: "https://cdn.jsdelivr.net/gh/SagerNet/sing-geosite@rule-set/geosite-cn.srs",
            download_detour: "🚀 直接连接",
          },
          {
            tag: "geoip-gfwblack",
            type: "remote",
            url: `${publicServerUrl}/public/proxy/sing-box/convert/rule/12?url=${encodeURIComponent("https://cdn.jsdelivr.net/gh/ohmywrt/clash-rule@master/gfwip.yaml")}`,
            format: "source",
            download_detour: "🚀 直接连接",
          },
        ],
        final: "⚓️ 其他流量",
      },
      experimental: {
        cache_file: {
          enabled: true,
          store_fakeip: true,
          store_rdrc: false,
        },
        clash_api: {
          external_controller: "0.0.0.0:9999",
          external_ui: "/etc/sb/ui",
          external_ui_download_url:
            "https://gh-proxy.org/https://github.com/MetaCubeX/metacubexd/archive/refs/heads/gh-pages.zip",
          secret: "123456",
          default_mode: "rule",
        },
      },
    };
  }

  /** 将 Clash 规则转换为 Sing-box 格式 - 带版本号路径 */
  @Get("proxy/sing-box/convert/rule/:version")
  async convertRuleVersioned(
    @Query("url") url: string,
    @Param("version") versionParam: string,
    @Res() res: Response,
  ) {
    return this.handleConvertRule(url, versionParam, res);
  }

  /** 将 Clash 规则转换为 Sing-box 格式 - 默认版本 */
  @Get("proxy/sing-box/convert/rule")
  async convertRule(@Query("url") url: string, @Res() res: Response) {
    return this.handleConvertRule(url, undefined, res);
  }

  /** 生成 Sing-box 订阅配置 (JSON) - 带版本号路径 */
  @Get("proxy/sing-box/:version/:uuid")
  async getSingboxConfigVersioned(
    @Param("uuid") uuid: string,
    @Param("version") versionParam: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    return this.handleSingboxConfig(uuid, versionParam, req, res);
  }

  /** 生成 Sing-box 订阅配置 (JSON) - 默认版本（兼容历史链接） */
  @Get("proxy/sing-box/:uuid")
  async getSingboxConfig(
    @Param("uuid") uuid: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    return this.handleSingboxConfig(uuid, undefined, req, res);
  }

  /** 生成 Sing-box 订阅配置 - 内部处理 */
  private async handleSingboxConfig(
    uuid: string,
    versionParam: string | undefined,
    req: Request,
    res: Response,
  ) {
    // 解析版本参数，默认为 11（sing-box 1.11 格式）
    const version = versionParam === "12" ? 12 : 11;

    // ssr 在所有 sing-box 版本中不支持；anytls 仅 sing-box 1.12+ 支持
    const excludeTypes = version === 11 ? ["ssr", "anytls"] : ["ssr"];
    const { subscribe, proxies, nodes } = await this.fetchProxies(
      uuid,
      excludeTypes,
    );

    // 构建规则提供者（从 JSONC 字符串解析）
    const ruleProviders: any[] = [];
    const rawRuleList = safeParseJsonc<ProxyRuleProvidersList>(
      subscribe.ruleList,
      {},
    );
    const ruleProvidersList =
      rawRuleList && Object.keys(rawRuleList).length > 0
        ? rawRuleList
        : DEFAULT_RULE_PROVIDERS;
    const rawGroups = safeParseJsonc<ProxyGroup[]>(subscribe.group, []);
    // 内置 outbound tag 不能作为 selector group 名称，否则会导致 tag 重复
    const BUILTIN_OUTBOUND_TAGS = new Set(["🚀 直接连接", "reject", "dns-out"]);
    const SINGBOX_KEYWORD_MAP: Record<string, string> = {
      REJECT: "reject",
      DIRECT: "🚀 直接连接",
    };
    const normalizeSingboxGroups = (groups: ProxyGroup[]): ProxyGroup[] =>
      groups
        .filter((g) => !BUILTIN_OUTBOUND_TAGS.has(g.name))
        .map((g) => ({
          ...g,
          proxies: g.proxies.map((p) => SINGBOX_KEYWORD_MAP[p] ?? p),
        }));
    const groups =
      rawGroups && rawGroups.length > 0
        ? normalizeSingboxGroups(rawGroups)
        : SB_DEFAULT_GROUPS;

    const publicServerUrl = this.getPublicServerUrl(req);

    // 构建规则提供者中的远程规则集
    const convertRuleBase =
      version === 12
        ? `${publicServerUrl}/public/proxy/sing-box/convert/rule/12`
        : `${publicServerUrl}/public/proxy/sing-box/convert/rule`;
    for (const [_key, items] of Object.entries(ruleProvidersList)) {
      for (const item of items) {
        ruleProviders.push({
          type: "remote",
          url: `${convertRuleBase}?url=${encodeURIComponent(item.url)}`,
          tag: item.name,
          format: "source",
          download_detour: "🚀 直接连接",
        });
      }
    }

    // 根据版本构建配置
    const data =
      version === 12
        ? this.buildSingboxV12(
            proxies,
            nodes,
            groups,
            ruleProvidersList,
            ruleProviders,
            publicServerUrl,
          )
        : this.buildSingboxV11(
            proxies,
            nodes,
            groups,
            ruleProvidersList,
            ruleProviders,
            publicServerUrl,
          );

    // 处理自定义规则（从 JSONC 字符串解析）
    const customConfig = safeParseJsonc<unknown[]>(subscribe.customConfig, []);
    if (customConfig.length && data.route?.rules) {
      for (const item of customConfig) {
        if (typeof item === "string") {
          const [type, value, outbound] = item.split(",");
          const rule: Partial<SingBoxRule> = {};
          switch (type) {
            case "DOMAIN":
              rule.domain = value;
              break;
            case "DOMAIN-SUFFIX":
              rule.domain_suffix = value;
              break;
            case "DOMAIN-KEYWORD":
              rule.domain_keyword = value;
              break;
            case "DOMAIN-REGEX":
              rule.domain_regex = value;
              break;
            case "IP-CIDR":
              rule.ip_cidr = value;
              break;
            case "SRC-IP-CIDR":
              rule.source_ip_cidr = value;
              break;
          }
          if (Object.keys(rule).length) {
            rule.outbound = outbound;
            data.route.rules.push(rule as SingBoxRule);
          }
        } else if (typeof item === "object") {
          data.route.rules.push(item as SingBoxRule);
        }
      }
    }

    // 添加规则提供者对应的路由规则
    for (const [key, items] of Object.entries(ruleProvidersList)) {
      if (data.route?.rules) {
        data.route.rules.push({
          outbound: key,
          rule_set: items.map((item) => item.name),
        });
      }
    }

    // 获取客户端信息
    const clientIp =
      (req.headers["x-forwarded-for"] as string | undefined)
        ?.split(",")[0]
        ?.trim() ||
      req.socket?.remoteAddress ||
      undefined;
    const userAgent = req.get("user-agent") || undefined;

    // 更新访问信息和记录日志
    await proxySubscribeService.updateAccessInfo(
      subscribe.id,
      proxies.length,
      version === 12 ? "sing-box-v12" : "sing-box",
      clientIp,
      userAgent,
    );

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.send(JSON.stringify(data, null, 2));
  }

  /** 规则转换 - 内部处理 */
  private async handleConvertRule(
    url: string,
    versionParam: string | undefined,
    res: Response,
  ) {
    if (!url) {
      throw new BadRequestException("url is required");
    }

    // 版本 12 使用 rule-set version 3，默认使用 version 1
    const ruleSetVersion = versionParam === "12" ? 3 : 1;

    const response = await fetch(url);
    const text = await response.text();
    const object = yaml.parse(text);

    const json: any = {
      rules: [
        {
          domain: [],
          domain_suffix: [],
          domain_keyword: [],
          domain_regex: [],
          ip_cidr: [],
          source_ip_cidr: [],
          port: [],
          source_port: [],
          process_name: [],
          process_path: [],
        },
      ],
      version: ruleSetVersion,
    };

    const arr = Array.isArray(object) ? object : object.payload;
    for (const line of arr || []) {
      const lineStr = String(line).trim();
      if (!lineStr || lineStr.startsWith("#")) continue;

      const parts = lineStr.split(",");
      // 如果没有逗号，说明是纯域名格式，默认作为 DOMAIN 处理
      if (parts.length === 1) {
        json.rules[0].domain.push(parts[0]);
        continue;
      }

      const [type, value] = parts;
      switch (type) {
        case "DOMAIN":
          json.rules[0].domain.push(value);
          break;
        case "DOMAIN-SUFFIX":
          json.rules[0].domain_suffix.push(value);
          break;
        case "DOMAIN-KEYWORD":
          json.rules[0].domain_keyword.push(value);
          break;
        case "DOMAIN-REGEX":
          json.rules[0].domain_regex.push(value);
          break;
        case "IP-CIDR":
        case "IP-CIDR6":
          json.rules[0].ip_cidr.push(value);
          break;
        case "SRC-IP-CIDR":
          json.rules[0].source_ip_cidr.push(value);
          break;
        // 更多 Clash 规则类型支持
        case "+":
        case "HOST":
          json.rules[0].domain.push(value);
          break;
        case "HOST-SUFFIX":
          json.rules[0].domain_suffix.push(value);
          break;
        case "HOST-KEYWORD":
          json.rules[0].domain_keyword.push(value);
          break;
      }
    }

    // 清理空数组
    for (const key of Object.keys(json.rules[0])) {
      if (json.rules[0][key].length === 0) {
        delete json.rules[0][key];
      }
    }

    res.setHeader("Content-Type", "application/json");
    res.json(json);
  }
}
