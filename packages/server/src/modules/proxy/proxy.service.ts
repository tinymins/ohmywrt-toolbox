import { TRPCError } from "@trpc/server";
import { and, eq, inArray, or, sql, gte, count } from "drizzle-orm";
import WebSocket from "ws";
import net from "node:net";
import * as yaml from "yaml";
import { parse as parseJsonc } from "jsonc-parser";
import { db } from "../../db/client";
import { proxySubscribes, proxyAccessLogs, users } from "../../db/schema";
import type { CreateProxySubscribeInput, UpdateProxySubscribeInput, ProxyPreviewNode } from "@acme/types";
import { appendIcon, DEFAULT_GROUPS, DEFAULT_RULE_PROVIDERS, DEFAULT_FILTER, DEFAULT_CUSTOM_CONFIG } from "./lib/config";
import { isBase64Subscription, parseBase64Subscription } from "./lib/subscription-parser";

type ProxySubscribeRow = typeof proxySubscribes.$inferSelect;
type UserRow = Pick<typeof users.$inferSelect, "id" | "name" | "email">;

export interface ProxySubscribeWithUser {
  id: string;
  userId: string;
  url: string;
  remark: string | null;
  // JSONC 字符串（前端编辑器直接显示）
  subscribeUrl: string | null;
  ruleList: string | null;
  group: string | null;
  filter: string | null;
  servers: string | null;
  customConfig: string | null;
  authorizedUserIds: string[];
  lastAccessAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: UserRow;
  authorizedUsers: UserRow[];
}

/** 将数据库行转换为 API 输出 */
const toProxySubscribeOutput = (
  row: ProxySubscribeRow,
  user: UserRow,
  authorizedUsers: UserRow[] = []
): ProxySubscribeWithUser => ({
  id: row.id,
  userId: row.userId,
  url: row.url,
  remark: row.remark,
  subscribeUrl: row.subscribeUrl,
  ruleList: row.ruleList,
  group: row.group,
  filter: row.filter,
  servers: row.servers,
  customConfig: row.customConfig,
  authorizedUserIds: (row.authorizedUserIds as string[] | null) ?? [],
  lastAccessAt: row.lastAccessAt?.toISOString() ?? null,
  createdAt: row.createdAt?.toISOString() ?? new Date().toISOString(),
  updatedAt: row.updatedAt?.toISOString() ?? new Date().toISOString(),
  user,
  authorizedUsers
});

export class ProxySubscribeService {
  /** 获取用户可见的所有订阅（创建的 + 被授权的） */
  async listByUser(userId: string): Promise<ProxySubscribeWithUser[]> {
    // 获取所有订阅
    const allSubscribes = await db
      .select({
        subscribe: proxySubscribes,
        user: {
          id: users.id,
          name: users.name,
          email: users.email
        }
      })
      .from(proxySubscribes)
      .leftJoin(users, eq(proxySubscribes.userId, users.id));

    // 过滤出用户创建的或被授权的订阅
    const filteredSubscribes = allSubscribes.filter((row) => {
      if (row.subscribe.userId === userId) return true;
      const authorizedUserIds = (row.subscribe.authorizedUserIds as string[] | null) ?? [];
      return authorizedUserIds.includes(userId);
    });

    // 获取所有授权用户信息
    const result: ProxySubscribeWithUser[] = [];
    for (const row of filteredSubscribes) {
      const authorizedUserIds = (row.subscribe.authorizedUserIds as string[] | null) ?? [];
      let authorizedUsers: UserRow[] = [];
      if (authorizedUserIds.length > 0) {
        authorizedUsers = await db
          .select({ id: users.id, name: users.name, email: users.email })
          .from(users)
          .where(inArray(users.id, authorizedUserIds));
      }
      result.push(toProxySubscribeOutput(
        row.subscribe,
        row.user ?? { id: row.subscribe.userId, name: "Unknown", email: "" },
        authorizedUsers
      ));
    }

    return result;
  }

  /** 根据 ID 获取订阅 */
  async getById(id: string): Promise<ProxySubscribeWithUser | null> {
    const [row] = await db
      .select({
        subscribe: proxySubscribes,
        user: {
          id: users.id,
          name: users.name,
          email: users.email
        }
      })
      .from(proxySubscribes)
      .leftJoin(users, eq(proxySubscribes.userId, users.id))
      .where(eq(proxySubscribes.id, id))
      .limit(1);

    if (!row) return null;

    const authorizedUserIds = (row.subscribe.authorizedUserIds as string[] | null) ?? [];
    let authorizedUsers: UserRow[] = [];
    if (authorizedUserIds.length > 0) {
      authorizedUsers = await db
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .where(inArray(users.id, authorizedUserIds));
    }

    return toProxySubscribeOutput(
      row.subscribe,
      row.user ?? { id: row.subscribe.userId, name: "Unknown", email: "" },
      authorizedUsers
    );
  }

  /** 根据 URL 获取订阅（用于公开端点） */
  async getByUrl(url: string): Promise<ProxySubscribeRow | null> {
    const [row] = await db
      .select()
      .from(proxySubscribes)
      .where(eq(proxySubscribes.url, url))
      .limit(1);

    return row ?? null;
  }

  /** 创建订阅 */
  async create(userId: string, input: CreateProxySubscribeInput): Promise<ProxySubscribeWithUser> {
    const [created] = await db
      .insert(proxySubscribes)
      .values({
        userId,
        remark: input.remark ?? null,
        subscribeUrl: input.subscribeUrl ?? null,
        ruleList: input.ruleList ?? null,
        group: input.group ?? null,
        filter: input.filter ?? null,
        servers: input.servers ?? null,
        customConfig: input.customConfig ?? null,
        authorizedUserIds: input.authorizedUserIds ?? []
      })
      .returning();

    const result = await this.getById(created.id);
    if (!result) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create subscribe" });
    }
    return result;
  }

  /** 更新订阅 */
  async update(id: string, userId: string, input: UpdateProxySubscribeInput): Promise<ProxySubscribeWithUser> {
    // 检查权限
    const existing = await this.getById(id);
    if (!existing) {
      throw new TRPCError({ code: "NOT_FOUND", message: "订阅不存在" });
    }

    const isOwner = existing.userId === userId;
    const isAuthorized = existing.authorizedUserIds.includes(userId);

    if (!isOwner && !isAuthorized) {
      throw new TRPCError({ code: "FORBIDDEN", message: "无权修改此订阅" });
    }

    const updateData: Partial<typeof proxySubscribes.$inferInsert> = {
      updatedAt: new Date()
    };

    if (input.remark !== undefined) updateData.remark = input.remark;
    if (input.subscribeUrl !== undefined) updateData.subscribeUrl = input.subscribeUrl;
    if (input.ruleList !== undefined) updateData.ruleList = input.ruleList;
    if (input.group !== undefined) updateData.group = input.group;
    if (input.filter !== undefined) updateData.filter = input.filter;
    if (input.servers !== undefined) updateData.servers = input.servers;
    if (input.customConfig !== undefined) updateData.customConfig = input.customConfig;
    // 只有创建者可以修改授权用户列表
    if (input.authorizedUserIds !== undefined && isOwner) {
      updateData.authorizedUserIds = input.authorizedUserIds;
    }

    await db
      .update(proxySubscribes)
      .set(updateData)
      .where(eq(proxySubscribes.id, id));

    const result = await this.getById(id);
    if (!result) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to update subscribe" });
    }
    return result;
  }

  /** 删除订阅 */
  async delete(id: string, userId: string): Promise<void> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new TRPCError({ code: "NOT_FOUND", message: "订阅不存在" });
    }
    if (existing.userId !== userId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "无权删除此订阅" });
    }

    await db
      .delete(proxySubscribes)
      .where(eq(proxySubscribes.id, id));
  }

  /** 更新最后访问时间和缓存节点数 */
  async updateAccessInfo(id: string, nodeCount: number, accessType: string, ip?: string, userAgent?: string): Promise<void> {
    // 更新订阅表
    await db
      .update(proxySubscribes)
      .set({
        lastAccessAt: new Date(),
        cachedNodeCount: nodeCount
      })
      .where(eq(proxySubscribes.id, id));

    // 记录访问日志
    await db
      .insert(proxyAccessLogs)
      .values({
        subscribeId: id,
        accessType,
        ip,
        userAgent,
        nodeCount
      });
  }

  /** 获取订阅统计信息 */
  async getStats(id: string, userId: string): Promise<{
    totalAccess: number;
    todayAccess: number;
    cachedNodeCount: number;
    lastAccessAt: string | null;
    accessByType: { type: string; count: number }[];
    recentAccess: { createdAt: string; accessType: string; ip: string | null; nodeCount: number }[];
  }> {
    const subscribe = await this.getById(id);
    if (!subscribe) {
      throw new TRPCError({ code: "NOT_FOUND", message: "订阅不存在" });
    }

    // 检查权限
    if (subscribe.userId !== userId && !subscribe.authorizedUserIds.includes(userId)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "无权访问此订阅" });
    }

    // 获取原始订阅数据以获取 cachedNodeCount
    const [rawSubscribe] = await db
      .select()
      .from(proxySubscribes)
      .where(eq(proxySubscribes.id, id))
      .limit(1);

    // 获取总访问次数
    const [totalResult] = await db
      .select({ count: count() })
      .from(proxyAccessLogs)
      .where(eq(proxyAccessLogs.subscribeId, id));

    // 获取今日访问次数
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [todayResult] = await db
      .select({ count: count() })
      .from(proxyAccessLogs)
      .where(and(
        eq(proxyAccessLogs.subscribeId, id),
        gte(proxyAccessLogs.createdAt, today)
      ));

    // 获取按类型统计
    const accessByType = await db
      .select({
        type: proxyAccessLogs.accessType,
        count: count()
      })
      .from(proxyAccessLogs)
      .where(eq(proxyAccessLogs.subscribeId, id))
      .groupBy(proxyAccessLogs.accessType);

    // 获取最近10条访问记录
    const recentAccess = await db
      .select({
        createdAt: proxyAccessLogs.createdAt,
        accessType: proxyAccessLogs.accessType,
        ip: proxyAccessLogs.ip,
        nodeCount: proxyAccessLogs.nodeCount
      })
      .from(proxyAccessLogs)
      .where(eq(proxyAccessLogs.subscribeId, id))
      .orderBy(sql`${proxyAccessLogs.createdAt} DESC`)
      .limit(10);

    return {
      totalAccess: totalResult?.count ?? 0,
      todayAccess: todayResult?.count ?? 0,
      cachedNodeCount: rawSubscribe?.cachedNodeCount ?? 0,
      lastAccessAt: subscribe.lastAccessAt,
      accessByType: accessByType.map(item => ({
        type: item.type,
        count: Number(item.count)
      })),
      recentAccess: recentAccess.map(item => ({
        createdAt: item.createdAt?.toISOString() ?? new Date().toISOString(),
        accessType: item.accessType,
        ip: item.ip,
        nodeCount: item.nodeCount ?? 0
      }))
    };
  }

  /** 获取用户的整体统计 */
  async getUserStats(userId: string): Promise<{
    totalSubscriptions: number;
    totalNodes: number;
    todayRequests: number;
  }> {
    // 获取用户可见的所有订阅
    const subscriptions = await this.listByUser(userId);
    const subscribeIds = subscriptions.map(s => s.id);

    // 如果没有订阅，直接返回 0
    if (subscribeIds.length === 0) {
      return {
        totalSubscriptions: 0,
        totalNodes: 0,
        todayRequests: 0
      };
    }

    // 计算总节点数（从缓存中）
    const [nodesResult] = await db
      .select({ total: sql<number>`COALESCE(SUM(cached_node_count), 0)` })
      .from(proxySubscribes)
      .where(inArray(proxySubscribes.id, subscribeIds));

    // 计算今日请求数
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [todayResult] = await db
      .select({ count: count() })
      .from(proxyAccessLogs)
      .where(and(
        inArray(proxyAccessLogs.subscribeId, subscribeIds),
        gte(proxyAccessLogs.createdAt, today)
      ));

    return {
      totalSubscriptions: subscriptions.length,
      totalNodes: Number(nodesResult?.total ?? 0),
      todayRequests: todayResult?.count ?? 0
    };
  }

  /** 获取默认配置（JSON 字符串格式） */
  getDefaults(): {
    ruleList: string;
    group: string;
    filter: string;
    customConfig: string;
  } {
    return {
      ruleList: JSON.stringify(DEFAULT_RULE_PROVIDERS, null, 2),
      group: JSON.stringify(DEFAULT_GROUPS, null, 2),
      filter: JSON.stringify(DEFAULT_FILTER, null, 2),
      customConfig: JSON.stringify(DEFAULT_CUSTOM_CONFIG, null, 2)
    };
  }

  /** 为节点名称添加国旗图标 */
  appendIcon(name: string): string {
    return appendIcon(name);
  }

  /** 安全解析 JSONC 字符串 */
  private safeParseJsonc<T>(jsonc: string | null, defaultValue: T): T {
    if (!jsonc) return defaultValue;
    try {
      return parseJsonc(jsonc) ?? defaultValue;
    } catch {
      return defaultValue;
    }
  }

  /** 预览订阅中的节点信息 */
  async previewNodes(id: string, userId: string): Promise<ProxyPreviewNode[]> {
    const subscribe = await this.getById(id);
    if (!subscribe) {
      throw new TRPCError({ code: "NOT_FOUND", message: "订阅不存在" });
    }

    // 检查权限：是创建者或被授权用户
    if (subscribe.userId !== userId && !subscribe.authorizedUserIds.includes(userId)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "无权访问此订阅" });
    }

    const nodes: ProxyPreviewNode[] = [];

    // 1. 解析附加的服务器配置（从 JSONC 字符串解析）
    const servers = this.safeParseJsonc<unknown[]>(subscribe.servers, []);
    for (const item of servers) {
      let proxy: any;
      if (typeof item === "string") {
        proxy = yaml.parse(item);
      } else {
        proxy = item;
      }
      if (proxy && proxy.name) {
        nodes.push({
          name: this.appendIcon(proxy.name),
          type: proxy.type || "unknown",
          server: proxy.server || "",
          port: proxy.port || 0,
          sourceIndex: 0,
          sourceUrl: "手动添加",
          raw: proxy
        });
      }
    }

    // 2. 获取远程订阅（从 JSONC 字符串解析）
    const subscribeUrls = this.safeParseJsonc<string[]>(subscribe.subscribeUrl, []);
    const filters = this.safeParseJsonc<string[]>(subscribe.filter, []);

    for (let i = 0; i < subscribeUrls.length; i++) {
      const url = subscribeUrls[i];
      if (typeof url !== "string" || !url) continue;

      try {
        const response = await fetch(url);
        const text = await response.text();
        let proxies: any[] = [];

        // 支持 Base64 编码的订阅格式
        if (isBase64Subscription(text)) {
          proxies = parseBase64Subscription(text);
        } else {
          const parsed = yaml.parse(text);
          proxies = parsed?.proxies ?? [];
        }

        // 遍历所有节点，标记被过滤的
        for (const proxy of proxies) {
          const matchedFilter = filters.find((f) => proxy.name && proxy.name.includes(f));
          nodes.push({
            name: this.appendIcon(proxy.name || ""),
            type: proxy.type || "unknown",
            server: proxy.server || "",
            port: proxy.port || 0,
            sourceIndex: i + 1,
            sourceUrl: url,
            raw: proxy,
            filtered: !!matchedFilter,
            filteredBy: matchedFilter
          });
        }
      } catch (e) {
        console.warn(`Failed to fetch subscription for preview: ${url}`, e);
        // 继续处理其他订阅源
      }
    }

    return nodes;
  }
}

export class ProxyRuleService {
  /** 测试 URL 匹配的规则 */
  async testRule(url: string): Promise<string> {
    let u: URL;
    try {
      u = new URL(url);
    } catch {
      u = new URL(`http://${url}`);
    }
    const port = Math.floor(Math.random() * 55535 + 10000);

    const clashWsUrl = process.env.CLASH_WS_URL;
    const clashWsToken = process.env.CLASH_WS_TOKEN;

    if (!clashWsUrl || !clashWsToken) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Clash WebSocket 未配置"
      });
    }

    return new Promise((resolve, reject) => {
      const abortController = new AbortController();

      const ws = new WebSocket(`${clashWsUrl}/logs?level=info&token=${clashWsToken}`, {
        signal: abortController.signal
      });

      ws.on("error", reject);
      ws.on("open", () => {
        const socket = net.connect({ port, host: u.hostname });
        socket.on("error", () => {});
      });
      ws.on("message", (data: Buffer) => {
        if (data.indexOf(`${u.hostname}:${port}`) !== -1) {
          resolve(JSON.parse(data.toString("utf-8")).payload);
        }
        ws.close();
      });
      setTimeout(() => {
        ws.close();
        abortController.abort();
        reject(new Error("查询超时，当前请求不在规则内，有两个原因造成\n1、iptables开启了跳过CN列表，被前置DNS解析为CN。\n2、toolbox客户端主动将域名解析为IP地址。查询不到与当前域名相关的记录。"));
      }, 5500);
    });
  }
}

export const proxySubscribeService = new ProxySubscribeService();
export const proxyRuleService = new ProxyRuleService();
