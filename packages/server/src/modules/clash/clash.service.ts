import { TRPCError } from "@trpc/server";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import WebSocket from "ws";
import net from "node:net";
import { db } from "../../db/client";
import { clashSubscribes, users } from "../../db/schema";
import type { ClashGroup, ClashRuleProvidersList, CreateClashSubscribeInput, UpdateClashSubscribeInput } from "@acme/types";
import { appendIcon, DEFAULT_GROUPS, DEFAULT_RULE_PROVIDERS } from "./lib/config";

type ClashSubscribeRow = typeof clashSubscribes.$inferSelect;
type UserRow = Pick<typeof users.$inferSelect, "id" | "name" | "email">;

export interface ClashSubscribeWithUser extends Omit<ClashSubscribeRow, "subscribeUrl" | "ruleList" | "group" | "filter" | "servers" | "customConfig" | "authorizedUserIds" | "lastAccessAt" | "createdAt" | "updatedAt"> {
  subscribeUrl: string[];
  ruleList: ClashRuleProvidersList;
  group: ClashGroup[];
  filter: string[];
  servers: unknown[];
  customConfig: unknown[];
  authorizedUserIds: string[];
  lastAccessAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: UserRow;
  authorizedUsers: UserRow[];
}

/** 将数据库行转换为 API 输出 */
const toClashSubscribeOutput = (
  row: ClashSubscribeRow,
  user: UserRow,
  authorizedUsers: UserRow[] = []
): ClashSubscribeWithUser => ({
  id: row.id,
  userId: row.userId,
  url: row.url,
  remark: row.remark,
  subscribeUrl: (row.subscribeUrl as string[] | null) ?? [],
  ruleList: (row.ruleList as ClashRuleProvidersList | null) ?? {},
  group: (row.group as ClashGroup[] | null) ?? [],
  filter: (row.filter as string[] | null) ?? [],
  servers: (row.servers as unknown[] | null) ?? [],
  customConfig: (row.customConfig as unknown[] | null) ?? [],
  authorizedUserIds: (row.authorizedUserIds as string[] | null) ?? [],
  lastAccessAt: row.lastAccessAt?.toISOString() ?? null,
  createdAt: row.createdAt?.toISOString() ?? new Date().toISOString(),
  updatedAt: row.updatedAt?.toISOString() ?? new Date().toISOString(),
  user,
  authorizedUsers
});

export class ClashSubscribeService {
  /** 获取用户可见的所有订阅（创建的 + 被授权的） */
  async listByUser(userId: string): Promise<ClashSubscribeWithUser[]> {
    // 获取所有订阅
    const allSubscribes = await db
      .select({
        subscribe: clashSubscribes,
        user: {
          id: users.id,
          name: users.name,
          email: users.email
        }
      })
      .from(clashSubscribes)
      .leftJoin(users, eq(clashSubscribes.userId, users.id));

    // 过滤出用户创建的或被授权的订阅
    const filteredSubscribes = allSubscribes.filter((row) => {
      if (row.subscribe.userId === userId) return true;
      const authorizedUserIds = (row.subscribe.authorizedUserIds as string[] | null) ?? [];
      return authorizedUserIds.includes(userId);
    });

    // 获取所有授权用户信息
    const result: ClashSubscribeWithUser[] = [];
    for (const row of filteredSubscribes) {
      const authorizedUserIds = (row.subscribe.authorizedUserIds as string[] | null) ?? [];
      let authorizedUsers: UserRow[] = [];
      if (authorizedUserIds.length > 0) {
        authorizedUsers = await db
          .select({ id: users.id, name: users.name, email: users.email })
          .from(users)
          .where(inArray(users.id, authorizedUserIds));
      }
      result.push(toClashSubscribeOutput(
        row.subscribe,
        row.user ?? { id: row.subscribe.userId, name: "Unknown", email: "" },
        authorizedUsers
      ));
    }

    return result;
  }

  /** 根据 ID 获取订阅 */
  async getById(id: string): Promise<ClashSubscribeWithUser | null> {
    const [row] = await db
      .select({
        subscribe: clashSubscribes,
        user: {
          id: users.id,
          name: users.name,
          email: users.email
        }
      })
      .from(clashSubscribes)
      .leftJoin(users, eq(clashSubscribes.userId, users.id))
      .where(eq(clashSubscribes.id, id))
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

    return toClashSubscribeOutput(
      row.subscribe,
      row.user ?? { id: row.subscribe.userId, name: "Unknown", email: "" },
      authorizedUsers
    );
  }

  /** 根据 URL 获取订阅（用于公开端点） */
  async getByUrl(url: string): Promise<ClashSubscribeRow | null> {
    const [row] = await db
      .select()
      .from(clashSubscribes)
      .where(eq(clashSubscribes.url, url))
      .limit(1);

    return row ?? null;
  }

  /** 创建订阅 */
  async create(userId: string, input: CreateClashSubscribeInput): Promise<ClashSubscribeWithUser> {
    const [created] = await db
      .insert(clashSubscribes)
      .values({
        userId,
        remark: input.remark ?? null,
        subscribeUrl: input.subscribeUrl ?? [],
        ruleList: input.ruleList ?? DEFAULT_RULE_PROVIDERS,
        group: input.group ?? DEFAULT_GROUPS,
        filter: input.filter ?? [],
        servers: input.servers ?? [],
        customConfig: input.customConfig ?? [],
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
  async update(id: string, userId: string, input: UpdateClashSubscribeInput): Promise<ClashSubscribeWithUser> {
    // 检查权限
    const existing = await this.getById(id);
    if (!existing) {
      throw new TRPCError({ code: "NOT_FOUND", message: "订阅不存在" });
    }
    if (existing.userId !== userId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "无权修改此订阅" });
    }

    const updateData: Partial<typeof clashSubscribes.$inferInsert> = {
      updatedAt: new Date()
    };

    if (input.remark !== undefined) updateData.remark = input.remark;
    if (input.subscribeUrl !== undefined) updateData.subscribeUrl = input.subscribeUrl;
    if (input.ruleList !== undefined) updateData.ruleList = input.ruleList;
    if (input.group !== undefined) updateData.group = input.group;
    if (input.filter !== undefined) updateData.filter = input.filter;
    if (input.servers !== undefined) updateData.servers = input.servers;
    if (input.customConfig !== undefined) updateData.customConfig = input.customConfig;
    if (input.authorizedUserIds !== undefined) updateData.authorizedUserIds = input.authorizedUserIds;

    await db
      .update(clashSubscribes)
      .set(updateData)
      .where(eq(clashSubscribes.id, id));

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
      .delete(clashSubscribes)
      .where(eq(clashSubscribes.id, id));
  }

  /** 更新最后访问时间 */
  async updateLastAccessTime(id: string): Promise<void> {
    await db
      .update(clashSubscribes)
      .set({ lastAccessAt: new Date() })
      .where(eq(clashSubscribes.id, id));
  }

  /** 为节点名称添加国旗图标 */
  appendIcon(name: string): string {
    return appendIcon(name);
  }
}

export class ClashRuleService {
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

export const clashSubscribeService = new ClashSubscribeService();
export const clashRuleService = new ClashRuleService();
