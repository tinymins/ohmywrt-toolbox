import { randomBytes } from "node:crypto";
import type { UserRole } from "@acme/types";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "../../db/client";
import {
  invitationCodes,
  sessions,
  systemSettings,
  testRequirements,
  todos,
  users,
  workspaceMembers,
  workspaces,
} from "../../db/schema";
import { getMessage, type Language } from "../../i18n";

export class AdminService {
  async getStats() {
    const result = await db.execute(
      sql`select count(*)::int as count from users`,
    );
    const count = Number(result.rows?.[0]?.count ?? 0);
    return { userCount: count };
  }

  /** 获取系统设置 */
  async getSystemSettings() {
    const [settings] = await db.select().from(systemSettings).limit(1);
    if (!settings) {
      const [created] = await db
        .insert(systemSettings)
        .values({ allowRegistration: true, singleWorkspaceMode: false })
        .returning();
      return created;
    }
    return settings;
  }

  /** 更新系统设置 */
  async updateSystemSettings(updates: {
    allowRegistration?: boolean;
    singleWorkspaceMode?: boolean;
  }) {
    const settings = await this.getSystemSettings();
    const [updated] = await db
      .update(systemSettings)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(systemSettings.id, settings.id))
      .returning();
    return updated;
  }

  /** 获取所有用户列表（超管功能） */
  async listUsers() {
    const allUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    return allUsers.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role as UserRole,
      lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
      createdAt: u.createdAt?.toISOString() ?? new Date().toISOString(),
    }));
  }

  /** 更新用户角色（超管功能） */
  async updateUserRole(
    userId: string,
    role: UserRole,
    operatorId: string,
    language: Language,
  ) {
    // 不能修改自己的角色
    if (userId === operatorId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: getMessage(language, "errors.admin.cannotChangeOwnRole"),
      });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: getMessage(language, "errors.admin.userNotFound"),
      });
    }

    const [updated] = await db
      .update(users)
      .set({ role })
      .where(eq(users.id, userId))
      .returning();

    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role as UserRole,
      lastLoginAt: updated.lastLoginAt?.toISOString() ?? null,
      createdAt: updated.createdAt?.toISOString() ?? new Date().toISOString(),
    };
  }

  /** 强制重置用户密码（超管功能） */
  async forceResetPassword(
    userId: string,
    newPassword: string,
    operatorId: string,
    language: Language,
  ) {
    // 不能重置自己的密码（应该用个人设置）
    if (userId === operatorId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: getMessage(language, "errors.admin.usePersonalSettings"),
      });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: getMessage(language, "errors.admin.userNotFound"),
      });
    }

    await db
      .update(users)
      .set({ passwordHash: newPassword })
      .where(eq(users.id, userId));

    return { success: true };
  }

  /** 删除用户（超管功能） */
  async deleteUser(userId: string, operatorId: string, language: Language) {
    // 不能删除自己
    if (userId === operatorId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: getMessage(language, "errors.admin.cannotDeleteSelf"),
      });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: getMessage(language, "errors.admin.userNotFound"),
      });
    }

    // 不能删除其他超级管理员
    if (user.role === "superadmin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: getMessage(language, "errors.admin.cannotDeleteSuperadmin"),
      });
    }

    // 使用事务删除用户及关联数据
    await db.transaction(async (tx) => {
      // 1. 删除用户的 sessions
      await tx.delete(sessions).where(eq(sessions.userId, userId));

      // 2. 获取用户拥有的工作空间
      const ownedWorkspaces = await tx
        .select({ id: workspaces.id })
        .from(workspaces)
        .where(eq(workspaces.ownerId, userId));

      const ownedWorkspaceIds = ownedWorkspaces.map((w) => w.id);

      if (ownedWorkspaceIds.length > 0) {
        // 3. 删除这些工作空间下的 todos
        await tx
          .delete(todos)
          .where(inArray(todos.workspaceId, ownedWorkspaceIds));

        // 4. 删除这些工作空间下的 test_requirements
        await tx
          .delete(testRequirements)
          .where(inArray(testRequirements.workspaceId, ownedWorkspaceIds));

        // 5. 删除这些工作空间的成员关系
        await tx
          .delete(workspaceMembers)
          .where(inArray(workspaceMembers.workspaceId, ownedWorkspaceIds));

        // 6. 删除这些工作空间
        await tx
          .delete(workspaces)
          .where(inArray(workspaces.id, ownedWorkspaceIds));
      }

      // 7. 删除用户在其他工作空间的成员关系
      await tx
        .delete(workspaceMembers)
        .where(eq(workspaceMembers.userId, userId));

      // 8. 清理用户创建的 todos 的 createdBy 引用
      await tx
        .update(todos)
        .set({ createdBy: null })
        .where(eq(todos.createdBy, userId));

      // 9. 清理用户创建/负责的 test_requirements 的引用
      await tx
        .update(testRequirements)
        .set({ createdBy: null })
        .where(eq(testRequirements.createdBy, userId));
      await tx
        .update(testRequirements)
        .set({ assigneeId: null })
        .where(eq(testRequirements.assigneeId, userId));

      // 10. 最后删除用户
      await tx.delete(users).where(eq(users.id, userId));
    });

    return { success: true };
  }

  /** 手动创建用户（超管功能） */
  async createUser(
    input: { name: string; email: string; password: string; role?: UserRole },
    language: Language,
  ) {
    // 检查邮箱是否已存在
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1);

    if (existing) {
      throw new TRPCError({
        code: "CONFLICT",
        message: getMessage(language, "errors.admin.emailAlreadyRegistered"),
      });
    }

    const role = input.role ?? "user";
    const workspaceName = `${input.name}${getMessage(language, "errors.admin.workspaceSuffix")}`;

    // 生成唯一的 workspace slug
    const baseSlug =
      input.name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "") || "workspace";
    let slug = baseSlug;
    let suffix = 1;

    while (true) {
      const [existingWs] = await db
        .select({ id: workspaces.id })
        .from(workspaces)
        .where(eq(workspaces.slug, slug))
        .limit(1);
      if (!existingWs) break;
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    // 使用事务创建用户和默认工作空间
    const result = await db.transaction(async (tx) => {
      const [createdUser] = await tx
        .insert(users)
        .values({
          name: input.name,
          email: input.email,
          passwordHash: input.password,
          role,
        })
        .returning();

      const [createdWorkspace] = await tx
        .insert(workspaces)
        .values({
          slug,
          name: workspaceName,
          description: getMessage(
            language,
            "errors.admin.defaultWorkspaceDesc",
          ),
          ownerId: createdUser.id,
        })
        .returning();

      await tx.insert(workspaceMembers).values({
        workspaceId: createdWorkspace.id,
        userId: createdUser.id,
        role: "owner",
      });

      return createdUser;
    });

    return {
      id: result.id,
      name: result.name,
      email: result.email,
      role: result.role as UserRole,
      lastLoginAt: null,
      createdAt: result.createdAt?.toISOString() ?? new Date().toISOString(),
    };
  }

  // =========== 邀请码功能 ===========

  /** 生成邀请码 */
  async generateInvitationCode(createdBy: string, expiresInHours?: number) {
    const code = randomBytes(16).toString("hex"); // 32位随机码
    const expiresAt = expiresInHours
      ? new Date(Date.now() + expiresInHours * 60 * 60 * 1000)
      : null;

    const [created] = await db
      .insert(invitationCodes)
      .values({
        code,
        createdBy,
        expiresAt,
      })
      .returning();

    return {
      id: created.id,
      code: created.code,
      createdBy: created.createdBy,
      usedBy: null,
      usedAt: null,
      expiresAt: created.expiresAt?.toISOString() ?? null,
      createdAt: created.createdAt?.toISOString() ?? new Date().toISOString(),
    };
  }

  /** 验证邀请码是否有效 */
  async validateInvitationCode(code: string) {
    const [invitation] = await db
      .select()
      .from(invitationCodes)
      .where(
        and(eq(invitationCodes.code, code), isNull(invitationCodes.usedBy)),
      )
      .limit(1);

    if (!invitation) {
      return { valid: false, reason: "invalid" as const };
    }

    // 检查是否过期
    if (invitation.expiresAt && invitation.expiresAt < new Date()) {
      return { valid: false, reason: "expired" as const };
    }

    return { valid: true, invitation };
  }

  /** 使用邀请码（标记为已使用） */
  async useInvitationCode(code: string, usedBy: string) {
    await db
      .update(invitationCodes)
      .set({
        usedBy,
        usedAt: new Date(),
      })
      .where(eq(invitationCodes.code, code));
  }

  /** 获取邀请码列表 */
  async listInvitationCodes() {
    const codes = await db
      .select()
      .from(invitationCodes)
      .orderBy(desc(invitationCodes.createdAt));

    return codes.map((c) => ({
      id: c.id,
      code: c.code,
      createdBy: c.createdBy,
      usedBy: c.usedBy ?? null,
      usedAt: c.usedAt?.toISOString() ?? null,
      expiresAt: c.expiresAt?.toISOString() ?? null,
      createdAt: c.createdAt?.toISOString() ?? new Date().toISOString(),
    }));
  }

  /** 删除邀请码 */
  async deleteInvitationCode(codeId: string) {
    await db.delete(invitationCodes).where(eq(invitationCodes.id, codeId));
    return { success: true };
  }
}

export const adminService = new AdminService();
