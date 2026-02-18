import type { UserRole } from "@acme/types";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { InferSelectModel } from "drizzle-orm";
import { and, eq, gt } from "drizzle-orm";
import { db } from "../db/client";
import { sessions, workspaces } from "../db/schema";
import { normalizeLanguage } from "../i18n";

type Workspace = InferSelectModel<typeof workspaces>;

const SESSION_COOKIE_NAME = "SESSION_ID";

const getCookieValue = (cookieHeader: string | undefined, name: string) => {
  if (!cookieHeader) return undefined;
  const match = cookieHeader
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=")[1]) : undefined;
};

export const createContext = async ({
  req,
  res,
}: CreateExpressContextOptions) => {
  const sessionId = getCookieValue(req.headers.cookie, SESSION_COOKIE_NAME);
  let userId: string | undefined;
  if (sessionId) {
    const [session] = await db
      .select({ userId: sessions.userId })
      .from(sessions)
      .where(
        and(eq(sessions.id, sessionId), gt(sessions.expiresAt, new Date())),
      )
      .limit(1);
    userId = session?.userId;
  }
  const workspaceKey = req.headers["x-workspace-id"];
  const languageHeader =
    req.headers["x-lang"] ?? req.headers["accept-language"];
  const languageValue = Array.isArray(languageHeader)
    ? languageHeader[0]
    : languageHeader;
  const language = normalizeLanguage(
    typeof languageValue === "string" ? languageValue : undefined,
  );

  return {
    db,
    userId,
    sessionId,
    workspaceKey: typeof workspaceKey === "string" ? workspaceKey : undefined,
    workspace: undefined as Workspace | undefined,
    userRole: undefined as UserRole | undefined,
    language,
    res,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;
