---
description: "Use when working on server-side code: tRPC routers, services, Prisma, middleware, or backend modules in packages/server."
applyTo: "packages/server/**"
---

# Server Patterns

## 环境变量加载

`env.ts` 必须是 `main.ts` 的 **第一个 import**（ESM import 全部被提升，side-effect import 保证执行顺序）：

```typescript
// main.ts
import "./env";  // ← MUST be first
import { Hono } from "hono";
// ...
```

端口配置通过 `SERVER_PORT` 环境变量控制（默认 4000），CORS origin 自动从 `WEB_PORT` 推导。

## Module Structure

Each module follows a consistent file layout:

```
modules/[feature]/
  [feature].mapper.ts   # DB entity -> API output transformation
  [feature].service.ts  # Business logic + Prisma queries
  [feature].router.ts   # tRPC router with procedures
  index.ts              # Re-exports mapper + service + router
```

## Mapper Pattern

```typescript
// user.mapper.ts — transform Prisma rows to output shapes
import type { User } from "@/generated/prisma/client/client";
import type { UserSettings } from "@acme/types";

export const toUserOutput = (user: User) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  settings: (user.settings as UserSettings | null) ?? null,
});
```

- Prisma types imported from `@/generated/prisma/client/client`
- `toXxxOutput()` lives in its own **`xxx.mapper.ts`** file — never expose raw Prisma rows
- JSON fields (like `settings`) need explicit casting to their typed shape

## Service Pattern

```typescript
// user.service.ts
import { db } from "@/db/client";
import type { Prisma } from "@/generated/prisma/client/client";

export class UserService {
  async getById(userId: string) {
    return db.user.findUnique({ where: { id: userId } });
  }

  async create(
    input: { name: string; email: string; passwordHash: string },
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? db;
    return client.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash: input.passwordHash,
        role: "user",
      },
    });
  }
}

export const userService = new UserService();
```

- Export singleton: `export const xService = new XService()`
- Support optional transactions: `tx?: Prisma.TransactionClient`
- Use `@/` path aliases, not relative paths

## tRPC Router Pattern

```typescript
import { z } from "zod";
import { protectedProcedure, router } from "@/trpc/init";
import { AppError } from "@/trpc/errors";
import { UserProfileOutputSchema, UserUpdateInputSchema } from "@acme/types";
import { userService } from "./user.service";
import { toUserOutput } from "./user.mapper";

export const userRouter = router({
  getProfile: protectedProcedure
    .input(z.void())
    .output(UserProfileOutputSchema)
    .query(async ({ ctx }) => {
      const user = await userService.getById(ctx.userId);
      if (!user) throw AppError.notFound(ctx.language, "errors.user.notFound");
      return toUserOutput(user);
    }),

  updateProfile: protectedProcedure
    .input(UserUpdateInputSchema)
    .output(UserProfileOutputSchema)
    .mutation(async ({ input, ctx }) => { /* ... */ }),
});
```

## Procedures

| Procedure | Use case | Import from |
|-----------|----------|-------------|
| `publicProcedure` | No auth required | `@/trpc/init` |
| `protectedProcedure` | Requires `ctx.userId` | `@/trpc/init` |
| `wechatProtectedProcedure` | Requires `ctx.wechatUserId` | `@/trpc/init` |
| `workspaceProtectedProcedure` | Requires workspace membership | `@/trpc/middlewares` |
| `adminProcedure` | Requires admin or superadmin role | `@/trpc/middlewares` |
| `superAdminProcedure` | Requires superadmin role only | `@/trpc/middlewares` |

### Admin Procedures

```typescript
import { adminProcedure, superAdminProcedure } from "@/trpc/middlewares";

export const adminRouter = router({
  // admin + superadmin can access
  getSystemSettings: adminProcedure
    .output(SystemSettingsOutputSchema)
    .query(async () => { /* ... */ }),

  // superadmin only
  listUsers: superAdminProcedure
    .output(z.array(AdminUserSchema))
    .query(async () => { /* ... */ }),

  updateUserRole: superAdminProcedure
    .input(UpdateUserRoleInputSchema)
    .mutation(async ({ input, ctx }) => { /* ... */ }),
});
```

## Error Handling

Errors: `AppError.notFound()` / `AppError.badRequest()` / `AppError.unauthorized()` / `AppError.forbidden()` / `AppError.tooManyRequests()`

All `AppError` factories require **two** args: `(language: Language, i18nKey: string)`:

```typescript
throw AppError.notFound(ctx.language, "errors.user.notFound");
throw AppError.forbidden(ctx.language, "errors.common.adminRequired");
```

## Registering a Router

```typescript
// trpc/router.ts
import { featureRouter } from "@/modules/feature";

export const appRouter = router({
  feature: featureRouter, // add here
});
export type AppRouter = typeof appRouter;
```

## Module Index

```typescript
// modules/user/index.ts
export { toUserOutput } from "./user.mapper";
export { userRouter } from "./user.router";
export { userService } from "./user.service";
```

## Prisma / Database

After any schema change in `prisma/schema.prisma`:

```sh
pnpm --filter @acme/server db:push      # push to DB, no migration files (dev)
pnpm --filter @acme/server db:generate  # regenerate Prisma client
pnpm --filter @acme/server db:migrate   # create migration files + apply (production)
```

DB is PostgreSQL 18 running in Docker. Start it with `docker compose -f docker/docker-compose.dev.yml --env-file .env up -d`.

## Logger

```typescript
import { Logger } from "@/logger";
const logger = new Logger("ModuleName");
logger.log("message");   // INFO
logger.warn("message");  // WARN
logger.error("message"); // ERROR
```

## Cookie-Based Sessions

Authentication uses HTTP-only cookies (`SESSION_ID`), not JWT tokens:

```typescript
import { setSessionCookie, clearSessionCookie } from "@/utils/session";

// Login: set session cookie
const sessionId = await authService.createSession(user.id);
setSessionCookie(ctx.resHeaders, sessionId);

// Logout: clear session cookie
clearSessionCookie(ctx.resHeaders);
```

Session resolution happens in `@/utils/request-auth.ts` via `resolveRequestAuth(headers)`.

## Storage

- `StorageProvider` trait: `upload`, `download`, `delete`, `exists`, `list` — async, pluggable
- Uses **OpenDAL** with local filesystem backend (no MinIO/S3 container needed)
- Storage path: `{DATA_LOCAL_PATH}/storage/`
- Backend stores **file keys** (e.g. `avatars/1234.jpg`) in DB, never full URLs
- Upload route responds with `{ success: true, data: { key } }`
- Frontend resolves URL via `/storage/{key}` endpoint
