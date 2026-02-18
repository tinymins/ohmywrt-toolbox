import type { UserRole, UserSettings } from "@acme/types";
import { SYSTEM_SHARED_SLUG } from "@acme/types";
import { eq, sql } from "drizzle-orm";
import type { Response } from "express";
import { db } from "../../db/client";
import {
  sessions,
  systemSettings,
  users,
  workspaceMembers,
  workspaces,
} from "../../db/schema";
import { getMessage, type Language } from "../../i18n";

const SESSION_COOKIE_NAME = "SESSION_ID";
const SESSION_COOKIE_MAX_AGE = 1000 * 60 * 60 * 24 * 7;

export const toUserOutput = (user: typeof users.$inferSelect) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role as UserRole,
  settings: (user.settings as UserSettings | null) ?? null,
});

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

export class AuthService {
  async getUserByEmail(email: string) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user ?? null;
  }

  async getDefaultWorkspaceSlug(userId: string) {
    const [workspace] = await db
      .select({ slug: workspaces.slug })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
      .where(eq(workspaceMembers.userId, userId))
      .orderBy(workspaces.createdAt)
      .limit(1);
    return workspace?.slug ?? null;
  }

  async ensureUniqueWorkspaceSlug(base: string) {
    const baseSlug = slugify(base) || "workspace";
    let slug = baseSlug;
    let suffix = 1;

    // 系统保留的 slug 列表
    const reservedSlugs = [SYSTEM_SHARED_SLUG];

    // eslint-disable-next-line no-constant-condition
    while (true) {
      // 检查是否是系统保留 slug
      if (reservedSlugs.includes(slug)) {
        slug = `${baseSlug}-${suffix}`;
        suffix += 1;
        continue;
      }

      const [existing] = await db
        .select({ id: workspaces.id })
        .from(workspaces)
        .where(eq(workspaces.slug, slug))
        .limit(1);
      if (!existing) return slug;
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }
  }

  async createSession(userId: string) {
    const expiresAt = new Date(Date.now() + SESSION_COOKIE_MAX_AGE);
    const [session] = await db
      .insert(sessions)
      .values({ userId, expiresAt })
      .returning({ id: sessions.id });

    // 更新用户最后登录时间
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, userId));

    return session.id;
  }

  async deleteSession(sessionId: string) {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
  }

  /** 检查系统是否有任何用户（用于判断第一个注册用户） */
  async isFirstUser(): Promise<boolean> {
    const result = await db.execute(
      sql`SELECT COUNT(*)::int AS count FROM users`,
    );
    const count = Number(result.rows?.[0]?.count ?? 0);
    return count === 0;
  }

  /** 获取系统设置 */
  async getSystemSettings() {
    const [settings] = await db.select().from(systemSettings).limit(1);
    if (!settings) {
      // 初始化默认设置
      const [created] = await db
        .insert(systemSettings)
        .values({ allowRegistration: true, singleWorkspaceMode: false })
        .returning();
      return created;
    }
    return settings;
  }

  /** 检查是否允许注册 */
  async isRegistrationAllowed(): Promise<boolean> {
    const settings = await this.getSystemSettings();
    return settings.allowRegistration;
  }

  /** 获取或创建共享工作空间（用于单一空间模式） */
  async getOrCreateSharedWorkspace(language: Language) {
    const sharedSlug = SYSTEM_SHARED_SLUG;
    const [existing] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.slug, sharedSlug))
      .limit(1);

    if (existing) {
      return existing;
    }

    // 创建共享工作空间
    const [created] = await db
      .insert(workspaces)
      .values({
        slug: sharedSlug,
        name: getMessage(language, "errors.admin.sharedWorkspaceName"),
        description: getMessage(language, "errors.admin.sharedWorkspaceDesc"),
        ownerId: null,
      })
      .returning();

    return created;
  }

  async registerUser(
    input: { name: string; email: string; password: string },
    language: Language,
  ) {
    // 检查是否是第一个用户
    const isFirst = await this.isFirstUser();
    const role: UserRole = isFirst ? "superadmin" : "user";

    // 检查是否启用单一空间模式
    const settings = await this.getSystemSettings();

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

      let workspace: typeof workspaces.$inferSelect | undefined;

      if (settings.singleWorkspaceMode) {
        // 单一空间模式：使用共享空间
        workspace = await this.getOrCreateSharedWorkspace(language);

        // 检查用户是否已经是共享空间的成员
        const [existingMember] = await tx
          .select()
          .from(workspaceMembers)
          .where(eq(workspaceMembers.workspaceId, workspace.id))
          .limit(1);

        await tx.insert(workspaceMembers).values({
          workspaceId: workspace.id,
          userId: createdUser.id,
          role: existingMember ? "member" : "owner",
        });
      } else {
        // 正常模式：创建个人工作空间
        const workspaceName = `${input.name}${getMessage(language, "errors.admin.workspaceSuffix")}`;
        const workspaceSlug =
          await this.ensureUniqueWorkspaceSlug(workspaceName);

        const [createdWorkspace] = await tx
          .insert(workspaces)
          .values({
            slug: workspaceSlug,
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

        workspace = createdWorkspace;
      }

      return { user: createdUser, workspace };
    });

    return result;
  }

  setSessionCookie(res: Response, sessionId: string) {
    res.cookie(SESSION_COOKIE_NAME, sessionId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: SESSION_COOKIE_MAX_AGE,
      path: "/",
    });
  }

  clearSessionCookie(res: Response) {
    res.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
  }
}

export const authService = new AuthService();
