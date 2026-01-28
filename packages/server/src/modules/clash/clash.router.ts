import { Logger } from "@nestjs/common";
import { z } from "zod";
import type { Context } from "../../trpc/context";
import { Ctx, Mutation, Query, Router, UseMiddlewares } from "../../trpc/decorators";
import { requireUser } from "../../trpc/middlewares";
import { clashSubscribeService, clashRuleService } from "./clash.service";
import {
  ClashSubscribeWithUserSchema,
  CreateClashSubscribeInputSchema,
  UpdateClashSubscribeInputSchema,
  DeleteClashSubscribeInputSchema,
  ClashRuleTestInputSchema
} from "@acme/types";

// 简化的用户 schema
const SimpleUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string()
});

// 订阅输出 schema（JSONC 字符串）
export const ClashSubscribeOutputSchema = z.object({
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

export const ClashSubscribeListOutputSchema = z.array(ClashSubscribeOutputSchema);

@Router({ alias: "clash" })
export class ClashRouter {
  private readonly logger = new Logger(ClashRouter.name);

  constructor() {
    this.logger.log("ClashRouter registered");
  }

  /** 获取当前用户可见的所有订阅 */
  @UseMiddlewares(requireUser)
  @Query({ output: ClashSubscribeListOutputSchema })
  async list(@Ctx() ctx: Context) {
    return clashSubscribeService.listByUser(ctx.userId!);
  }

  /** 根据 ID 获取订阅详情 */
  @UseMiddlewares(requireUser)
  @Query({
    input: z.object({ id: z.string() }),
    output: ClashSubscribeOutputSchema.nullable()
  })
  async getById(input: { id: string }, @Ctx() ctx: Context) {
    const subscribe = await clashSubscribeService.getById(input.id);
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
    input: CreateClashSubscribeInputSchema,
    output: ClashSubscribeOutputSchema
  })
  async create(input: z.infer<typeof CreateClashSubscribeInputSchema>, @Ctx() ctx: Context) {
    return clashSubscribeService.create(ctx.userId!, input);
  }

  /** 更新订阅 */
  @UseMiddlewares(requireUser)
  @Mutation({
    input: UpdateClashSubscribeInputSchema,
    output: ClashSubscribeOutputSchema
  })
  async update(input: z.infer<typeof UpdateClashSubscribeInputSchema>, @Ctx() ctx: Context) {
    return clashSubscribeService.update(input.id, ctx.userId!, input);
  }

  /** 删除订阅 */
  @UseMiddlewares(requireUser)
  @Mutation({
    input: DeleteClashSubscribeInputSchema,
    output: z.object({ success: z.boolean() })
  })
  async delete(input: z.infer<typeof DeleteClashSubscribeInputSchema>, @Ctx() ctx: Context) {
    await clashSubscribeService.delete(input.id, ctx.userId!);
    return { success: true };
  }

  /** 测试规则匹配 */
  @UseMiddlewares(requireUser)
  @Query({
    input: ClashRuleTestInputSchema,
    output: z.object({ result: z.string() })
  })
  async testRule(input: z.infer<typeof ClashRuleTestInputSchema>) {
    const result = await clashRuleService.testRule(input.url);
    return { result };
  }
}
