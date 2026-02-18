import {
  AdminUserSchema,
  CreateUserInputSchema,
  ForceResetPasswordInputSchema,
  InvitationCodeSchema,
  SystemSettingsSchema,
  UpdateUserRoleInputSchema,
} from "@acme/types";
import { Logger } from "@nestjs/common";
import { z } from "zod";
import type { Context } from "../../trpc/context";
import {
  Ctx,
  Mutation,
  Query,
  Router,
  UseMiddlewares,
} from "../../trpc/decorators";
import { requireAdmin, requireSuperAdmin } from "../../trpc/middlewares";
import { adminService } from "./admin.service";

export const statsOutput = z.tuple([z.number(), z.number(), z.string()]);

@Router({ alias: "admin" })
export class AdminRouter {
  private readonly logger = new Logger(AdminRouter.name);

  constructor() {
    this.logger.log("AdminRouter registered");
  }

  @Query({ output: statsOutput })
  async stats() {
    const stats = await adminService.getStats();
    return [stats.userCount, 42, "OK"] as const;
  }

  @Query({ output: z.string() })
  async health() {
    return "healthy";
  }

  // =========== 管理员功能（admin + superadmin） ===========

  /** 获取系统设置 */
  @Query({ output: SystemSettingsSchema })
  @UseMiddlewares(requireAdmin)
  async getSystemSettings() {
    const settings = await adminService.getSystemSettings();
    const override = process.env.SINGLE_WORKSPACE_MODE_OVERRIDE;
    const isOverridden = override === "true" || override === "false";
    return {
      allowRegistration: settings.allowRegistration,
      singleWorkspaceMode: isOverridden
        ? override === "true"
        : settings.singleWorkspaceMode,
      singleWorkspaceModeOverridden: isOverridden,
    };
  }

  /** 更新系统设置 */
  @Mutation({
    input: z.object({
      allowRegistration: z.boolean().optional(),
      singleWorkspaceMode: z.boolean().optional(),
    }),
    output: SystemSettingsSchema,
  })
  @UseMiddlewares(requireAdmin)
  async updateSystemSettings(input: {
    allowRegistration?: boolean;
    singleWorkspaceMode?: boolean;
  }) {
    const override = process.env.SINGLE_WORKSPACE_MODE_OVERRIDE;
    const isOverridden = override === "true" || override === "false";
    // 如果环境变量覆盖了 singleWorkspaceMode，则忽略该字段的更新
    const { singleWorkspaceMode, ...rest } = input;
    const updateInput = isOverridden ? rest : input;
    const updated = await adminService.updateSystemSettings(updateInput);
    return {
      allowRegistration: updated.allowRegistration,
      singleWorkspaceMode: isOverridden
        ? override === "true"
        : updated.singleWorkspaceMode,
      singleWorkspaceModeOverridden: isOverridden,
    };
  }

  // =========== 超级管理员功能（superadmin only） ===========

  /** 获取所有用户列表 */
  @Query({ output: z.array(AdminUserSchema) })
  @UseMiddlewares(requireSuperAdmin)
  async listUsers() {
    return adminService.listUsers();
  }

  /** 更新用户角色 */
  @Mutation({ input: UpdateUserRoleInputSchema, output: AdminUserSchema })
  @UseMiddlewares(requireSuperAdmin)
  async updateUserRole(
    input: z.infer<typeof UpdateUserRoleInputSchema>,
    @Ctx() ctx: Context,
  ) {
    return adminService.updateUserRole(
      input.userId,
      input.role,
      ctx.userId!,
      ctx.language,
    );
  }

  /** 强制重置用户密码 */
  @Mutation({
    input: ForceResetPasswordInputSchema,
    output: z.object({ success: z.boolean() }),
  })
  @UseMiddlewares(requireSuperAdmin)
  async forceResetPassword(
    input: z.infer<typeof ForceResetPasswordInputSchema>,
    @Ctx() ctx: Context,
  ) {
    return adminService.forceResetPassword(
      input.userId,
      input.newPassword,
      ctx.userId!,
      ctx.language,
    );
  }

  /** 删除用户 */
  @Mutation({
    input: z.object({ userId: z.string() }),
    output: z.object({ success: z.boolean() }),
  })
  @UseMiddlewares(requireSuperAdmin)
  async deleteUser(input: { userId: string }, @Ctx() ctx: Context) {
    return adminService.deleteUser(input.userId, ctx.userId!, ctx.language);
  }

  /** 手动创建用户 */
  @Mutation({ input: CreateUserInputSchema, output: AdminUserSchema })
  @UseMiddlewares(requireSuperAdmin)
  async createUser(
    input: z.infer<typeof CreateUserInputSchema>,
    @Ctx() ctx: Context,
  ) {
    return adminService.createUser(input, ctx.language);
  }

  // =========== 邀请码功能（superadmin only） ===========

  /** 生成邀请码 */
  @Mutation({
    input: z.object({ expiresInHours: z.number().optional() }),
    output: InvitationCodeSchema,
  })
  @UseMiddlewares(requireSuperAdmin)
  async generateInvitationCode(
    input: { expiresInHours?: number },
    @Ctx() ctx: Context,
  ) {
    return adminService.generateInvitationCode(
      ctx.userId!,
      input.expiresInHours,
    );
  }

  /** 获取邀请码列表 */
  @Query({ output: z.array(InvitationCodeSchema) })
  @UseMiddlewares(requireSuperAdmin)
  async listInvitationCodes() {
    return adminService.listInvitationCodes();
  }

  /** 删除邀请码 */
  @Mutation({
    input: z.object({ codeId: z.string() }),
    output: z.object({ success: z.boolean() }),
  })
  @UseMiddlewares(requireSuperAdmin)
  async deleteInvitationCode(input: { codeId: string }) {
    return adminService.deleteInvitationCode(input.codeId);
  }
}
