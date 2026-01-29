import { Logger } from "@nestjs/common";
import { z } from "zod";
import type { Context } from "../../trpc/context";
import { Ctx, Mutation, Query, Router, UseMiddlewares } from "../../trpc/decorators";
import { requireUser } from "../../trpc/middlewares";
import { proxySubscribeService, proxyRuleService } from "./proxy.service";
import {
  ProxySubscribeWithUserSchema,
  CreateProxySubscribeInputSchema,
  UpdateProxySubscribeInputSchema,
  DeleteProxySubscribeInputSchema,
  ProxyRuleTestInputSchema,
  ProxyPreviewInputSchema,
  ProxyPreviewOutputSchema
} from "@acme/types";

// 简化的用户 schema
const SimpleUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string()
});

// 订阅输出 schema（JSONC 字符串）
export const ProxySubscribeOutputSchema = z.object({
  id: z.string(),
  userId: z.string(),
  url: z.string(),
  remark: z.string().nullable(),
  // 这些字段现在是 JSONC 字符串
  subscribeUrl: z.string().nullable(),
  ruleList: z.string().nullable(),
  group: z.string().nullable(),
  filter: z.string().nullable(),
  servers: z.string().nullable(),
  customConfig: z.string().nullable(),
  authorizedUserIds: z.array(z.string()),
  lastAccessAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  user: SimpleUserSchema,
  authorizedUsers: z.array(SimpleUserSchema)
});

export const ProxySubscribeListOutputSchema = z.array(ProxySubscribeOutputSchema);

@Router({ alias: "proxy" })
export class ProxyRouter {
  private readonly logger = new Logger(ProxyRouter.name);

  constructor() {
    this.logger.log("ProxyRouter registered");
  }

  /** 获取当前用户可见的所有订阅 */
  @UseMiddlewares(requireUser)
  @Query({ output: ProxySubscribeListOutputSchema })
  async list(@Ctx() ctx: Context) {
    return proxySubscribeService.listByUser(ctx.userId!);
  }

  /** 根据 ID 获取订阅详情 */
  @UseMiddlewares(requireUser)
  @Query({
    input: z.object({ id: z.string() }),
    output: ProxySubscribeOutputSchema.nullable()
  })
  async getById(input: { id: string }, @Ctx() ctx: Context) {
    const subscribe = await proxySubscribeService.getById(input.id);
    if (!subscribe) return null;

    // 检查权限：是创建者或被授权用户
    if (subscribe.userId !== ctx.userId && !subscribe.authorizedUserIds.includes(ctx.userId!)) {
      return null;
    }

    return subscribe;
  }

  /** 创建订阅 */
  @UseMiddlewares(requireUser)
  @Mutation({
    input: CreateProxySubscribeInputSchema,
    output: ProxySubscribeOutputSchema
  })
  async create(input: z.infer<typeof CreateProxySubscribeInputSchema>, @Ctx() ctx: Context) {
    return proxySubscribeService.create(ctx.userId!, input);
  }

  /** 更新订阅 */
  @UseMiddlewares(requireUser)
  @Mutation({
    input: UpdateProxySubscribeInputSchema,
    output: ProxySubscribeOutputSchema
  })
  async update(input: z.infer<typeof UpdateProxySubscribeInputSchema>, @Ctx() ctx: Context) {
    return proxySubscribeService.update(input.id, ctx.userId!, input);
  }

  /** 删除订阅 */
  @UseMiddlewares(requireUser)
  @Mutation({
    input: DeleteProxySubscribeInputSchema,
    output: z.object({ success: z.boolean() })
  })
  async delete(input: z.infer<typeof DeleteProxySubscribeInputSchema>, @Ctx() ctx: Context) {
    await proxySubscribeService.delete(input.id, ctx.userId!);
    return { success: true };
  }

  /** 测试规则匹配 */
  @UseMiddlewares(requireUser)
  @Query({
    input: ProxyRuleTestInputSchema,
    output: z.object({ result: z.string() })
  })
  async testRule(input: z.infer<typeof ProxyRuleTestInputSchema>) {
    const result = await proxyRuleService.testRule(input.url);
    return { result };
  }

  /** 预览订阅中的节点信息 */
  @UseMiddlewares(requireUser)
  @Query({
    input: ProxyPreviewInputSchema,
    output: ProxyPreviewOutputSchema
  })
  async previewNodes(input: z.infer<typeof ProxyPreviewInputSchema>, @Ctx() ctx: Context) {
    const nodes = await proxySubscribeService.previewNodes(input.id, ctx.userId!);
    return { nodes };
  }

  /** 获取订阅统计信息 */
  @UseMiddlewares(requireUser)
  @Query({
    input: z.object({ id: z.string() }),
    output: z.object({
      totalAccess: z.number(),
      todayAccess: z.number(),
      cachedNodeCount: z.number(),
      lastAccessAt: z.string().nullable(),
      accessByType: z.array(z.object({
        type: z.string(),
        count: z.number()
      })),
      recentAccess: z.array(z.object({
        createdAt: z.string(),
        accessType: z.string(),
        ip: z.string().nullable(),
        nodeCount: z.number()
      }))
    })
  })
  async getStats(input: { id: string }, @Ctx() ctx: Context) {
    return proxySubscribeService.getStats(input.id, ctx.userId!);
  }

  /** 获取用户整体统计 */
  @UseMiddlewares(requireUser)
  @Query({
    output: z.object({
      totalSubscriptions: z.number(),
      totalNodes: z.number(),
      todayRequests: z.number()
    })
  })
  async getUserStats(@Ctx() ctx: Context) {
    return proxySubscribeService.getUserStats(ctx.userId!);
  }
}
