import { SystemSettingsSchema, UserSchema } from "@acme/types";
import { Logger } from "@nestjs/common";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getMessage } from "../../i18n";
import type { Context } from "../../trpc/context";
import { Ctx, Mutation, Query, Router } from "../../trpc/decorators";
import { adminService } from "../admin/admin.service";
import { authService, toUserOutput } from "./auth.service";

export const loginInput = z.object({
  email: z.string().email(),
  password: z.string().min(4),
});

export const registerInput = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(4),
  invitationCode: z.string().optional(), // 邀请码（可选）
});

export const userOutput = UserSchema;

export const authOutput = z.object({
  user: userOutput,
  defaultWorkspaceSlug: z.string(),
});

export const logoutOutput = z.object({
  success: z.boolean(),
});

// 注册状态输出
export const registrationStatusOutput = z.object({
  allowed: z.boolean(),
  isFirstUser: z.boolean(),
});

@Router({ alias: "auth" })
export class AuthRouter {
  private readonly logger = new Logger(AuthRouter.name);

  constructor() {
    this.logger.log("AuthRouter registered");
  }

  /** 获取注册状态（是否允许注册、是否第一个用户） */
  @Query({ output: registrationStatusOutput })
  async registrationStatus() {
    const [allowed, isFirstUser] = await Promise.all([
      authService.isRegistrationAllowed(),
      authService.isFirstUser(),
    ]);
    return { allowed: allowed || isFirstUser, isFirstUser };
  }

  /** 获取系统设置 */
  @Query({ output: SystemSettingsSchema })
  async systemSettings() {
    const settings = await authService.getSystemSettings();
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

  @Mutation({ input: loginInput, output: authOutput })
  async login(input: z.infer<typeof loginInput>, @Ctx() ctx: Context) {
    const user = await authService.getUserByEmail(input.email);

    if (!user || user.passwordHash !== input.password) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: getMessage(ctx.language, "errors.auth.invalidCredentials"),
      });
    }

    const defaultWorkspaceSlug = await authService.getDefaultWorkspaceSlug(
      user.id,
    );

    if (!defaultWorkspaceSlug) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: getMessage(
          ctx.language,
          "errors.auth.defaultWorkspaceNotFound",
        ),
      });
    }

    const sessionId = await authService.createSession(user.id);
    authService.setSessionCookie(ctx.res, sessionId);

    return {
      user: toUserOutput(user),
      defaultWorkspaceSlug,
    };
  }

  @Mutation({ input: registerInput, output: authOutput })
  async register(input: z.infer<typeof registerInput>, @Ctx() ctx: Context) {
    // 验证邀请码（如果提供）
    let validInvitation = false;
    if (input.invitationCode) {
      const result = await adminService.validateInvitationCode(
        input.invitationCode,
      );
      if (!result.valid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            result.reason === "expired"
              ? getMessage(ctx.language, "errors.auth.invitationExpired")
              : getMessage(ctx.language, "errors.auth.invitationInvalid"),
        });
      }
      validInvitation = true;
    }

    // 检查是否允许注册（邀请码有效时跳过此检查）
    const isFirstUser = await authService.isFirstUser();
    if (!isFirstUser && !validInvitation) {
      const allowed = await authService.isRegistrationAllowed();
      if (!allowed) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: getMessage(ctx.language, "errors.auth.registrationDisabled"),
        });
      }
    }

    const existing = await authService.getUserByEmail(input.email);
    if (existing) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: getMessage(ctx.language, "errors.auth.emailAlreadyRegistered"),
      });
    }

    const result = await authService.registerUser(input, ctx.language);

    // 如果使用了邀请码，标记为已使用
    if (input.invitationCode && validInvitation) {
      await adminService.useInvitationCode(
        input.invitationCode,
        result.user.id,
      );
    }

    const sessionId = await authService.createSession(result.user.id);
    authService.setSessionCookie(ctx.res, sessionId);

    return {
      user: toUserOutput(result.user),
      defaultWorkspaceSlug: result.workspace.slug,
    };
  }

  @Mutation({ output: logoutOutput })
  async logout(@Ctx() ctx: Context) {
    if (ctx.sessionId) {
      await authService.deleteSession(ctx.sessionId);
    }
    authService.clearSessionCookie(ctx.res);
    return { success: true };
  }
}
