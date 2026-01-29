import { Controller, Get, Param, Query, Req, Res, BadRequestException, NotFoundException, Logger } from "@nestjs/common";
import type { Request, Response } from "express";
import * as yaml from "yaml";
import { parse as parseJsonc } from "jsonc-parser";
import { proxySubscribeService } from "./proxy.service";
import { convertClashToSingbox } from "./lib/converter";
import { isBase64Subscription, parseBase64Subscription } from "./lib/subscription-parser";
import { DEFAULT_RULE_PROVIDERS, DEFAULT_GROUPS, SB_DEFAULT_GROUPS } from "./lib/config";
import type { ProxyGroup, ProxyRuleProvidersList } from "@acme/types";
import type { Singbox, SingBoxRule } from "./lib/types";

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

    // 获取远程订阅（从 JSONC 字符串解析）
    const subscribeUrls = safeParseJsonc<string[]>(subscribe.subscribeUrl, []);
    const filters = safeParseJsonc<string[]>(subscribe.filter, []);

    if (subscribeUrls.length > 0) {
      const results = await Promise.all(
        subscribeUrls
          .filter((url) => typeof url === "string" && url)
          .map(async (url) => {
            try {
              const response = await fetch(url);
              const text = await response.text();
              // 支持 Base64 编码的订阅格式
              if (isBase64Subscription(text)) {
                return { proxies: parseBase64Subscription(text) };
              }
              return yaml.parse(text);
            } catch (e) {
              this.logger.warn(`Failed to fetch subscription: ${url}`, e);
              return null;
            }
          })
      );

      for (const item of results) {
        if (item?.proxies) {
          let filtered = item.proxies.filter((p: any) =>
            !filters.some((f) => p.name && p.name.includes(f))
          );
          // 排除指定类型
          if (excludeTypes.length > 0) {
            filtered = filtered.filter((p: any) => !excludeTypes.includes(p.type));
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

  /** 生成 Clash 订阅配置 (YAML) */
  @Get("proxy/clash/:uuid")
  async getClashConfig(@Param("uuid") uuid: string, @Req() req: Request, @Res() res: Response) {
    const { subscribe, proxies, nodes } = await this.fetchProxies(uuid);

    // 构建规则（从 JSONC 字符串解析）
    const ruleSet: string[] = [];
    const ruleProviders: Record<string, any> = {};
    const rawRuleList = safeParseJsonc<ProxyRuleProvidersList>(subscribe.ruleList, {});
    const ruleProvidersList = (rawRuleList && Object.keys(rawRuleList).length > 0) ? rawRuleList : DEFAULT_RULE_PROVIDERS;

    for (const [key, items] of Object.entries(ruleProvidersList)) {
      for (const item of items) {
        ruleSet.push(`RULE-SET,${item.name},${key}`);
        ruleProviders[item.name] = {
          type: "http",
          behavior: item.type ?? "classical",
          url: item.url,
          path: `./rules/${item.name}`,
          interval: 86400
        };
      }
    }

    const rawGroups = safeParseJsonc<ProxyGroup[]>(subscribe.group, []);
    const groups = (rawGroups && rawGroups.length > 0) ? rawGroups : DEFAULT_GROUPS;
    const customConfig = safeParseJsonc<string[]>(subscribe.customConfig, []);

    const rules = [
      ...customConfig.filter((item) => typeof item === "string"),
      ...ruleSet,
      "DOMAIN-SUFFIX,local,DIRECT",
      "GEOIP,LAN,DIRECT,no-resolve",
      "GEOIP,CN,DIRECT,no-resolve",
      "MATCH,⚓️ 其他流量"
    ];

    const data = {
      "tproxy-port": 7893,
      "allow-lan": true,
      mode: "Rule",
      "log-level": "info",
      secret: "123456",
      proxies,
      "proxy-groups": groups.map((item) => {
        if (item.readonly) {
          return {
            name: item.name,
            type: item.type,
            proxies: item.proxies
          };
        }
        return {
          name: item.name,
          type: item.type,
          proxies: [...item.proxies, ...nodes]
        };
      }),
      "rule-providers": ruleProviders,
      rules,
      profile: {
        "store-selected": true,
        "store-fake-ip": true,
        tracing: true
      }
    };

    // 获取客户端信息
    const clientIp = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim()
      || req.socket?.remoteAddress
      || undefined;
    const userAgent = req.get("user-agent") || undefined;

    // 更新访问信息和记录日志
    await proxySubscribeService.updateAccessInfo(
      subscribe.id,
      proxies.length,
      "clash",
      clientIp,
      userAgent
    );

    res.setHeader("content-type", "text/plain; charset=utf-8");
    res.send(`
#---------------------------------------------------#
## Update: ${new Date().toString()}
#---------------------------------------------------#
${yaml.stringify(data)}`);
  }

  /** 生成 Sing-box 订阅配置 (JSON) */
  @Get("proxy/sing-box/:uuid")
  async getSingboxConfig(@Param("uuid") uuid: string, @Req() req: Request, @Res() res: Response) {
    const { subscribe, proxies, nodes } = await this.fetchProxies(uuid, ["ssr"]);

    // 构建规则提供者（从 JSONC 字符串解析）
    const ruleProviders: any[] = [];
    const rawRuleList = safeParseJsonc<ProxyRuleProvidersList>(subscribe.ruleList, {});
    const ruleProvidersList = (rawRuleList && Object.keys(rawRuleList).length > 0) ? rawRuleList : DEFAULT_RULE_PROVIDERS;
    const rawGroups = safeParseJsonc<ProxyGroup[]>(subscribe.group, []);
    const groups = (rawGroups && rawGroups.length > 0) ? rawGroups : SB_DEFAULT_GROUPS;
    // 从请求获取完整的 origin URL，支持反向代理场景
    const forwardedProto = req.headers["x-forwarded-proto"] as string | undefined;
    const forwardedPort = req.headers["x-forwarded-port"] as string | undefined;
    const protocol = forwardedProto || (req.secure ? "https" : "http");
    const hostHeader = req.get("host") || "localhost:4000";
    // 如果有 X-Forwarded-Port 且不是默认端口，则替换/追加端口
    let host = hostHeader;
    if (forwardedPort && forwardedPort !== "80" && forwardedPort !== "443") {
      // 移除原有端口（如果有），添加转发的端口
      host = hostHeader.split(":")[0] + ":" + forwardedPort;
    }
    const publicServerUrl = `${protocol}://${host}`;

    const select = groups.map((item) => {
      const outbounds = item.readonly ? item.proxies : [...item.proxies, ...nodes];
      return {
        type: "selector" as const,
        tag: item.name,
        outbounds,
        default: outbounds[0],
        interrupt_exist_connections: true
      };
    });

    for (const [key, items] of Object.entries(ruleProvidersList)) {
      for (const item of items) {
        ruleProviders.push({
          type: "remote",
          url: `${publicServerUrl}/public/proxy/sing-box/convert/rule?url=${encodeURIComponent(item.url)}`,
          tag: item.name,
          format: "source",
          download_detour: "🚀 直接连接"
        });
      }
    }

    const data: Singbox = {
      log: {
        disabled: false,
        level: "info",
        timestamp: true
      },
      dns: {
        disable_cache: false,
        servers: [
          { tag: "local", address: "127.0.0.1", detour: "🚀 直接连接" },
          { tag: "fakeip", address: "fakeip", strategy: "ipv4_only" },
          { tag: "local_v4", address: "127.0.0.1", strategy: "ipv4_only", detour: "🚀 直接连接" }
        ],
        rules: [
          { query_type: ["HTTPS"], action: "reject" },
          {
            ip_cidr: ["127.0.0.0/8", "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"],
            server: "local"
          },
          { rule_set: ["geosite-cn"], server: "local" },
          {
            type: "logical",
            mode: "and",
            rules: [
              { rule_set: ["geoip-cn"] },
              { rule_set: ["geoip-hk"], invert: true },
              { rule_set: ["geoip-gfwblack"], invert: true }
            ],
            server: "local"
          },
          {
            disable_cache: false,
            rewrite_ttl: 300,
            query_type: ["A", "AAAA"],
            server: "fakeip"
          }
        ],
        disable_expire: false,
        independent_cache: false,
        reverse_mapping: false,
        fakeip: {
          enabled: true,
          inet4_range: "198.18.0.0/15",
          inet6_range: "fc00::/18"
        }
      },
      inbounds: [
        { type: "direct", tag: "dns-in", listen: "::", sniff: true, listen_port: 1053 },
        {
          type: "tproxy",
          listen: "::",
          listen_port: 7893,
          tcp_multi_path: false,
          tcp_fast_open: true,
          udp_fragment: true,
          sniff: true,
          sniff_override_destination: false
        }
      ],
      outbounds: [
        { type: "direct", tag: "🚀 直接连接" },
        { tag: "dns-out", type: "dns" },
        { type: "block", tag: "reject" },
        ...convertClashToSingbox({ proxies }),
        ...select
      ],
      route: {
        rules: [
          { outbound: "dns-out", inbound: ["dns-in"], protocol: "dns" },
          { outbound: "🚀 直接连接", rule_set: ["geoip-cn", "geosite-cn"], ip_is_private: true }
        ],
        rule_set: [
          ...ruleProviders,
          {
            tag: "geoip-cn",
            type: "remote",
            format: "binary",
            url: "https://cdn.jsdelivr.net/gh/SagerNet/sing-geoip@rule-set/geoip-cn.srs",
            download_detour: "🚀 直接连接"
          },
          {
            tag: "geoip-hk",
            type: "remote",
            format: "binary",
            url: "https://cdn.jsdelivr.net/gh/SagerNet/sing-geoip@rule-set/geoip-hk.srs",
            download_detour: "🚀 直接连接"
          },
          {
            tag: "geosite-openai",
            type: "remote",
            format: "binary",
            url: "https://cdn.jsdelivr.net/gh/SagerNet/sing-geosite@rule-set/geosite-openai.srs",
            download_detour: "🚀 直接连接"
          },
          {
            tag: "geosite-cn",
            type: "remote",
            format: "binary",
            url: "https://cdn.jsdelivr.net/gh/SagerNet/sing-geosite@rule-set/geosite-cn.srs",
            download_detour: "🚀 直接连接"
          },
          {
            tag: "geoip-gfwblack",
            type: "remote",
            url: `${publicServerUrl}/public/proxy/sing-box/convert/rule?url=${encodeURIComponent("https://cdn.jsdelivr.net/gh/ohmywrt/clash-rule@master/gfwip.yaml")}`,
            format: "source",
            download_detour: "🚀 直接连接"
          }
        ],
        final: "⚓️ 其他流量"
      },
      experimental: {
        cache_file: {
          enabled: true,
          store_fakeip: true,
          store_rdrc: false
        },
        clash_api: {
          external_controller: "0.0.0.0:9999",
          external_ui: "/etc/sb/ui",
          external_ui_download_url: "https://mirror.ghproxy.com/https://github.com/MetaCubeX/metacubexd/archive/refs/heads/gh-pages.zip",
          secret: "123456",
          default_mode: "rule"
        }
      }
    };

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
          rule_set: items.map((item) => item.name)
        });
      }
    }

    // 获取客户端信息
    const clientIp = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim()
      || req.socket?.remoteAddress
      || undefined;
    const userAgent = req.get("user-agent") || undefined;

    // 更新访问信息和记录日志
    await proxySubscribeService.updateAccessInfo(
      subscribe.id,
      proxies.length,
      "sing-box",
      clientIp,
      userAgent
    );

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.send(JSON.stringify(data, null, 2));
  }

  /** 将 Clash 规则转换为 Sing-box 格式 */
  @Get("proxy/sing-box/convert/rule")
  async convertRule(@Query("url") url: string, @Res() res: Response) {
    if (!url) {
      throw new BadRequestException("url is required");
    }

    const response = await fetch(url);
    const text = await response.text();
    const object = yaml.parse(text);

    const json: any = {
      rules: [{
        domain: [],
        domain_suffix: [],
        domain_keyword: [],
        domain_regex: [],
        ip_cidr: [],
        source_ip_cidr: [],
        port: [],
        source_port: [],
        process_name: [],
        process_path: []
      }],
      version: 1
    };

    const arr = Array.isArray(object) ? object : object.payload;
    for (const line of arr || []) {
      const [type, value] = (line as string).split(",");
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
          json.rules[0].ip_cidr.push(value);
          break;
        case "SRC-IP-CIDR":
          json.rules[0].source_ip_cidr.push(value);
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
