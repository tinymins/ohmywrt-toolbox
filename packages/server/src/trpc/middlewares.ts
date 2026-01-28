import { TRPCError } from "@trpc/server";
import type { MiddlewareResult } from "@trpc/server/unstable-core-do-not-import";
import { and, eq, or } from "drizzle-orm";
import type { Context } from "./context";
import { workspaceMembers, workspaces } from "../db/schema";
import { getMessage } from "../i18n";

export const requireUser = async ({ ctx, next }: { ctx: Context; next: (opts?: { ctx?: Context }) => Promise<MiddlewareResult<Context>> }): Promise<MiddlewareResult<Context>> => {
  if (!ctx.userId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: getMessage(ctx.language, "errors.common.unauthorized")
    });
  }
  return next();
};

export const requireWorkspace = async ({ ctx, next }: { ctx: Context; next: (opts?: { ctx?: Context }) => Promise<MiddlewareResult<Context>> }): Promise<MiddlewareResult<Context>> => {
  if (!ctx.userId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: getMessage(ctx.language, "errors.common.unauthorized")
    });
  }

  if (!ctx.workspaceKey) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: getMessage(ctx.language, "errors.common.missingWorkspace")
    });
  }

  const isUuid = (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

  const workspaceWhere = isUuid(ctx.workspaceKey)
    ? or(eq(workspaces.id, ctx.workspaceKey), eq(workspaces.slug, ctx.workspaceKey))
    : eq(workspaces.slug, ctx.workspaceKey);

  const [workspace] = await ctx.db
    .select()
    .from(workspaces)
    .where(workspaceWhere)
    .limit(1);

  if (!workspace) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: getMessage(ctx.language, "errors.workspace.notFound")
    });
  }

  const [membership] = await ctx.db
    .select()
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspace.id),
        eq(workspaceMembers.userId, ctx.userId)
      )
    )
    .limit(1);

  if (!membership) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: getMessage(ctx.language, "errors.common.workspaceForbidden")
    });
  }

  return next({ ctx: { ...ctx, workspace } });
};
