import type {
  ProxyDebugFormat,
  ProxyDebugStep,
  ProxyGroup,
  ProxyPreviewNode,
  ProxyRuleProvidersList,
} from "@acme/types";
import { TRPCError } from "@trpc/server";
import { parse as parseJsonc } from "jsonc-parser";
import * as yaml from "yaml";
import {
  appendIcon,
  DEFAULT_GROUPS,
  DEFAULT_RULE_PROVIDERS,
  SB_DEFAULT_GROUPS,
} from "./lib/config";
import { convertClashToSingbox } from "./lib/converter";
import {
  isBase64Subscription,
  parseBase64Subscription,
} from "./lib/subscription-parser";
import type { SingBoxRule } from "./lib/types";
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

/** 将代理配置转换为 ProxyPreviewNode */
const toPreviewNode = (
  proxy: any,
  sourceIndex: number,
  sourceUrl: string,
): ProxyPreviewNode => ({
  name: appendIcon(proxy.name || ""),
  type: proxy.type || "unknown",
  server: proxy.server || "",
  port: proxy.port || 0,
  sourceIndex,
  sourceUrl,
  raw: proxy,
});

export class ProxyDebugService {
  /**
   * 流式调试订阅 — async generator，逐步 yield 每个调试步骤
   */
  async *debugSubscription(
    id: string,
    userId: string,
    format: ProxyDebugFormat,
  ): AsyncGenerator<ProxyDebugStep> {
    const startTime = performance.now();

    // 权限校验
    const subscribe = await proxySubscribeService.getById(id);
    if (!subscribe) {
      throw new TRPCError({ code: "NOT_FOUND", message: "订阅不存在" });
    }
    if (
      subscribe.userId !== userId &&
      !subscribe.authorizedUserIds.includes(userId)
    ) {
      throw new TRPCError({ code: "FORBIDDEN", message: "无权访问此订阅" });
    }

    // ──────────────────────────────────────────
    // Step 1: 配置解析
    // ──────────────────────────────────────────
    const subscribeUrls = safeParseJsonc<string[]>(subscribe.subscribeUrl, []);
    const filters = safeParseJsonc<string[]>(subscribe.filter, []);
    const rawGroups = safeParseJsonc<ProxyGroup[]>(subscribe.group, []);
    const groups =
      rawGroups && rawGroups.length > 0
        ? rawGroups
        : format === "sing-box" || format === "sing-box-v12"
          ? SB_DEFAULT_GROUPS
          : DEFAULT_GROUPS;
    const rawRuleList = safeParseJsonc<ProxyRuleProvidersList>(
      subscribe.ruleList,
      {},
    );
    const ruleProviders =
      rawRuleList && Object.keys(rawRuleList).length > 0
        ? rawRuleList
        : DEFAULT_RULE_PROVIDERS;
    const customConfig = safeParseJsonc<unknown[]>(subscribe.customConfig, []);
    const servers = safeParseJsonc<unknown[]>(subscribe.servers, []);

    yield {
      type: "config",
      data: {
        subscribeUrls,
        filters,
        groups,
        ruleProviders,
        customConfig,
        servers,
      },
    };

    // ──────────────────────────────────────────
    // Step 2: 手动服务器解析
    // ──────────────────────────────────────────
    const manualNodes: ProxyPreviewNode[] = [];
    const allProxies: any[] = [];

    for (const item of servers) {
      let proxy: any;
      if (typeof item === "string") {
        proxy = yaml.parse(item);
      } else {
        proxy = item;
      }
      if (proxy?.name) {
        manualNodes.push(toPreviewNode(proxy, 0, "手动添加"));
        allProxies.push({ ...proxy, name: appendIcon(proxy.name) });
      }
    }

    yield {
      type: "manual-servers",
      data: {
        count: manualNodes.length,
        nodes: manualNodes,
      },
    };

    // ──────────────────────────────────────────
    // Step 3: 远程订阅源逐一获取
    // ──────────────────────────────────────────
    let totalBeforeFilter = manualNodes.length;
    let totalFiltered = 0;

    for (let i = 0; i < subscribeUrls.length; i++) {
      const url = subscribeUrls[i];
      if (typeof url !== "string" || !url) continue;

      // 通知前端：开始获取
      yield {
        type: "source-start",
        data: { sourceIndex: i + 1, url },
      };

      const fetchStart = performance.now();
      let httpStatus: number | null = null;
      const httpHeaders: Record<string, string> = {};
      let rawText = "";
      let detectedFormat: "base64" | "yaml" | "unknown" = "unknown";
      let parsedNodeCount = 0;
      const nodesBeforeFilter: ProxyPreviewNode[] = [];
      const nodesAfterFilter: ProxyPreviewNode[] = [];
      const filteredNodes: { node: ProxyPreviewNode; matchedRule: string }[] =
        [];
      let error: string | null = null;

      try {
        const response = await fetch(url);
        httpStatus = response.status;

        // 收集关键响应头
        for (const key of [
          "content-type",
          "content-length",
          "subscription-userinfo",
          "profile-update-interval",
          "content-disposition",
        ]) {
          const val = response.headers.get(key);
          if (val) httpHeaders[key] = val;
        }

        rawText = await response.text();

        // 检测格式
        let proxies: any[] = [];
        if (isBase64Subscription(rawText)) {
          detectedFormat = "base64";
          proxies = parseBase64Subscription(rawText);
        } else {
          detectedFormat = "yaml";
          try {
            const parsed = yaml.parse(rawText);
            proxies = parsed?.proxies ?? [];
          } catch {
            detectedFormat = "unknown";
            proxies = [];
          }
        }

        parsedNodeCount = proxies.length;

        // 排除 Sing-box 不支持的类型
        const excludeTypes =
          format === "sing-box" || format === "sing-box-v12" ? ["ssr"] : [];

        // 逐一检查过滤规则
        for (const proxy of proxies) {
          const node = toPreviewNode(proxy, i + 1, url);
          nodesBeforeFilter.push(node);

          // 类型排除
          if (excludeTypes.includes(proxy.type)) {
            filteredNodes.push({
              node,
              matchedRule: `类型排除: ${proxy.type}`,
            });
            continue;
          }

          const matchedFilter = filters.find((f) => proxy.name?.includes(f));
          if (matchedFilter) {
            filteredNodes.push({ node, matchedRule: matchedFilter });
          } else {
            nodesAfterFilter.push(node);
            const enrichedProxy = {
              ...proxy,
              name: appendIcon(proxy.name),
            };
            allProxies.push(enrichedProxy);
          }
        }

        totalBeforeFilter += nodesBeforeFilter.length;
        totalFiltered += filteredNodes.length;
      } catch (e: any) {
        error = e?.message || String(e);
      }

      const fetchDurationMs = Math.round(performance.now() - fetchStart);

      yield {
        type: "source-result",
        data: {
          sourceIndex: i + 1,
          url,
          httpStatus,
          httpHeaders,
          rawText,
          format: detectedFormat,
          parsedNodeCount,
          nodesBeforeFilter,
          nodesAfterFilter,
          filteredNodes,
          error,
          fetchDurationMs,
        },
      };
    }

    // ──────────────────────────────────────────
    // Step 4: 节点合并
    // ──────────────────────────────────────────
    const finalNodeNames = allProxies
      .map((p) => p.name)
      .filter(Boolean) as string[];

    yield {
      type: "merge",
      data: {
        totalNodesBeforeFilter: totalBeforeFilter,
        totalNodesAfterFilter: allProxies.length,
        totalFiltered,
        finalNodeNames,
      },
    };

    // ──────────────────────────────────────────
    // Step 5: 配置组装
    // ──────────────────────────────────────────
    let configOutput = "";
    let ruleCount = 0;
    let ruleProviderCount = 0;

    if (format === "clash" || format === "clash-meta") {
      // 构建 Clash / Clash Meta 配置
      const ruleSet: string[] = [];
      const clashRuleProviders: Record<string, any> = {};

      for (const [key, items] of Object.entries(ruleProviders)) {
        for (const item of items) {
          ruleSet.push(`RULE-SET,${item.name},${key}`);
          clashRuleProviders[item.name] = {
            type: "http",
            behavior: item.type ?? "classical",
            url: item.url,
            path: `./rules/${item.name}`,
            interval: 86400,
          };
          ruleProviderCount++;
        }
      }

      const customConfigStrings = customConfig.filter(
        (item) => typeof item === "string",
      ) as string[];
      const rules = [
        ...customConfigStrings,
        ...ruleSet,
        "DOMAIN-SUFFIX,local,DIRECT",
        "GEOIP,LAN,DIRECT,no-resolve",
        "GEOIP,CN,DIRECT,no-resolve",
        "MATCH,⚓️ 其他流量",
      ];
      ruleCount = rules.length;

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
          proxies: [...item.proxies, ...finalNodeNames],
        };
      });

      // Clash Meta (mihomo) 特有字段
      const metaFields =
        format === "clash-meta"
          ? {
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
                  HTTP: {
                    ports: [80, "8080-8880"],
                    "override-destination": true,
                  },
                  TLS: { ports: [443, 8443] },
                  QUIC: { ports: [443, 8443] },
                },
              },
            }
          : {};

      const data = {
        "tproxy-port": 7893,
        "allow-lan": true,
        mode: "Rule",
        "log-level": "info",
        secret: "123456",
        ...metaFields,
        proxies: allProxies,
        "proxy-groups": proxyGroups,
        "rule-providers": clashRuleProviders,
        rules,
        profile: {
          "store-selected": true,
          "store-fake-ip": true,
          tracing: true,
        },
      };

      configOutput = `#---------------------------------------------------#\n## Debug output: ${new Date().toString()}\n#---------------------------------------------------#\n${yaml.stringify(data)}`;
    } else {
      // 构建 Sing-box 配置
      const version = format === "sing-box-v12" ? 12 : 11;
      const sbRuleProviders: any[] = [];

      const convertRuleBase =
        version === 12
          ? "/public/proxy/sing-box/convert/rule/12"
          : "/public/proxy/sing-box/convert/rule";

      for (const [, items] of Object.entries(ruleProviders)) {
        for (const item of items) {
          sbRuleProviders.push({
            type: "remote",
            url: `${convertRuleBase}?url=${encodeURIComponent(item.url)}`,
            tag: item.name,
            format: "source",
            download_detour: "🚀 直接连接",
          });
          ruleProviderCount++;
        }
      }

      // Build simplified sing-box output showing the structure
      const select = groups.map((item) => {
        const outbounds = item.readonly
          ? item.proxies
          : [...item.proxies, ...finalNodeNames];
        return {
          type: "selector" as const,
          tag: item.name,
          outbounds,
          default: outbounds[0],
          interrupt_exist_connections: true,
        };
      });

      const singboxOutbounds = [
        { type: "direct", tag: version === 12 ? "DIRECT" : "🚀 直接连接" },
        ...(version === 11 ? [{ tag: "dns-out", type: "dns" }] : []),
        { type: "block", tag: "reject" },
        ...convertClashToSingbox({ proxies: allProxies }),
        ...select,
      ];

      // Process custom config into sing-box rules
      const sbRouteRules: any[] = [];
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
            sbRouteRules.push(rule);
          }
        } else if (typeof item === "object") {
          sbRouteRules.push(item);
        }
      }

      // Add rule-set based route rules
      for (const [key, items] of Object.entries(ruleProviders)) {
        sbRouteRules.push({
          outbound: key,
          rule_set: items.map((item) => item.name),
        });
      }

      ruleCount = sbRouteRules.length;

      const data = {
        log: { disabled: false, level: "info", timestamp: true },
        outbounds: singboxOutbounds,
        route: {
          rules: sbRouteRules,
          rule_set: sbRuleProviders,
          final: "⚓️ 其他流量",
        },
      };

      configOutput = JSON.stringify(data, null, 2);
    }

    yield {
      type: "output",
      data: {
        proxyGroupCount: groups.length,
        ruleCount,
        ruleProviderCount,
        configOutput,
      },
    };

    // ──────────────────────────────────────────
    // Step 6: 完成
    // ──────────────────────────────────────────
    const totalDurationMs = Math.round(performance.now() - startTime);

    yield {
      type: "done",
      data: { totalDurationMs },
    };
  }
}

export const proxyDebugService = new ProxyDebugService();
