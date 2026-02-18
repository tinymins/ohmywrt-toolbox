import { SYSTEM_SHARED_SLUG } from "@acme/types";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/client";
import { todos, workspaceMembers, workspaces } from "../../db/schema";
import { getMessage, type Language } from "../../i18n";

export const toWorkspaceOutput = (
  dbWorkspace: typeof workspaces.$inferSelect,
) => ({
  id: dbWorkspace.id,
  slug: dbWorkspace.slug,
  name: dbWorkspace.name,
  description: dbWorkspace.description,
  ownerId: dbWorkspace.ownerId,
  createdAt: dbWorkspace.createdAt?.toISOString(),
});

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

export class WorkspaceService {
  async listByUser(userId: string) {
    const rows = await db
      .select()
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
      .where(eq(workspaceMembers.userId, userId));

    return rows.map((row) => row.workspaces);
  }

  async getBySlug(slug: string, userId: string) {
    const [row] = await db
      .select()
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
      .where(
        and(eq(workspaceMembers.userId, userId), eq(workspaces.slug, slug)),
      )
      .limit(1);

    return row?.workspaces ?? null;
  }

  async getById(id: string) {
    const [workspace] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, id))
      .limit(1);

    return workspace ?? null;
  }

  /** 系统保留的 slug */
  static readonly RESERVED_SLUGS = [SYSTEM_SHARED_SLUG];

  async ensureUniqueSlug(baseSlug: string) {
    let slug = baseSlug;
    let suffix = 1;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      // 检查是否是系统保留 slug
      if (WorkspaceService.RESERVED_SLUGS.includes(slug)) {
        suffix += 1;
        slug = `${baseSlug}-${suffix}`;
        continue;
      }

      const [existing] = await db
        .select({ id: workspaces.id })
        .from(workspaces)
        .where(eq(workspaces.slug, slug))
        .limit(1);
      if (!existing) break;
      suffix += 1;
      slug = `${baseSlug}-${suffix}`;
    }

    return slug;
  }

  async create(
    input: { name: string; slug?: string; description?: string | null },
    userId: string,
  ) {
    const baseSlug = input.slug?.trim() || slugify(input.name) || "workspace";
    const slug = await this.ensureUniqueSlug(baseSlug);

    const result = await db.transaction(async (tx) => {
      const [workspace] = await tx
        .insert(workspaces)
        .values({
          name: input.name,
          slug,
          description: input.description ?? null,
          ownerId: userId,
        })
        .returning();

      await tx.insert(workspaceMembers).values({
        workspaceId: workspace.id,
        userId,
        role: "owner",
      });

      return workspace;
    });

    return result;
  }

  async update(
    id: string,
    input: { name?: string; slug?: string; description?: string | null },
    userId: string,
    language: Language,
  ) {
    const workspace = await this.getById(id);

    if (!workspace) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: getMessage(language, "errors.workspace.notFound"),
      });
    }

    if (workspace.ownerId !== userId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: getMessage(language, "errors.workspace.onlyOwnerCanUpdate"),
      });
    }

    let nextSlug = input.slug?.trim();
    if (nextSlug) {
      nextSlug = slugify(nextSlug) || workspace.slug;

      // 检查是否是系统保留 slug
      if (WorkspaceService.RESERVED_SLUGS.includes(nextSlug)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: getMessage(language, "errors.workspace.slugReserved"),
        });
      }

      const [existing] = await db
        .select({ id: workspaces.id })
        .from(workspaces)
        .where(eq(workspaces.slug, nextSlug))
        .limit(1);
      if (existing && existing.id !== workspace.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: getMessage(language, "errors.workspace.slugExists"),
        });
      }
    }

    const [updated] = await db
      .update(workspaces)
      .set({
        name: input.name ?? workspace.name,
        slug: nextSlug ?? workspace.slug,
        description:
          input.description !== undefined
            ? input.description
            : workspace.description,
      })
      .where(eq(workspaces.id, id))
      .returning();

    return updated;
  }

  async delete(id: string, userId: string, language: Language) {
    const workspace = await this.getById(id);

    if (!workspace) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: getMessage(language, "errors.workspace.notFound"),
      });
    }

    if (workspace.ownerId !== userId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: getMessage(language, "errors.workspace.onlyOwnerCanDelete"),
      });
    }

    await db.transaction(async (tx) => {
      await tx.delete(todos).where(eq(todos.workspaceId, id));
      await tx
        .delete(workspaceMembers)
        .where(eq(workspaceMembers.workspaceId, id));
      await tx.delete(workspaces).where(eq(workspaces.id, id));
    });

    return { id };
  }
}

export const workspaceService = new WorkspaceService();
