# AI Stack

TypeScript monorepo (pnpm workspaces + Turborepo): Hono backend, React Router v7 SSR frontend, shared types.

**技术栈**：pnpm monorepo · React 19 + Tailwind CSS v4 · Hono 4 后端 · tRPC v11 · Prisma 7 + PostgreSQL · Zod v4 · TypeScript 端到端类型安全

**端口**：前端 `5173`，后端 `4000`。不要直接启动前后端，dev server 由用户持续运行，验证时告知用户在已运行的 dev server 上检查。

## Packages

| Package | Purpose |
|---------|---------|
| `packages/server` | Hono 4 + tRPC v11 + Prisma 7 + PostgreSQL |
| `packages/web` | React 19 + React Router v7 SSR + TailwindCSS 4 + TanStack Query v5 |
| `packages/types` | Shared Zod v4 schemas + TypeScript types |
| `packages/components` | Reusable UI components (TailwindCSS, no business logic) |
| `packages/i18n` | i18n locale resources (zh/en) |
| `packages/miniapp` | Taro 4 + React + WeChat Mini Program |

## CI 命令

| Command | What it does |
|---------|-------------|
| `make init` | Full project initialization (deps, services, DB migration) |
| `make dev` | Start dev environment (Docker services + dev servers) |
| `make dev-miniapp` | Start miniapp development watch |
| `make build` | Build production (server + web) |
| `make lint` | Biome lint + typecheck（修改后必须通过） |
| `make tsc` | TypeScript type check across all packages |

### Database

```sh
pnpm --filter @acme/server db:push      # sync schema to DB (dev, no migration files)
pnpm --filter @acme/server db:migrate   # create migration files + apply (production)
pnpm --filter @acme/server db:generate  # regenerate Prisma client after schema change
```

#### Query local DB (one-liner)

```sh
docker exec -it apps-postgres psql -U postgres -d app -c "SELECT * FROM users LIMIT 10;"
```

- **每次代码修改完成后必须运行 `make lint`**，确认 lint + typecheck 全部通过后才算完成任务

## 环境变量配置

| 文件 | 用途 | 消费者 |
|------|------|--------|
| `.env` | 开发总控：数据库连接 + 端口配置 + 功能开关 | Prisma CLI · Hono 后端 · Vite · Makefile · dev 数据库容器 |
| `docker/.env.example` | 生产环境配置模板 | `docker/docker-compose.yml`（生产全量部署） |
| `packages/web/.env` | 前端技术配置 | Vite（VITE_STORAGE_PUBLIC_URL） |
| `packages/server/.env` | 后端技术配置 | Hono 进程（DATABASE_URL for Prisma CLI） |

- DATABASE_URL 统一在根 `.env`，子包 `.env` 中仅为 Prisma CLI 保留副本
- 端口配置（SERVER_PORT / WEB_PORT / DB_PORT / REDIS_PORT / MINIO_PORT）放根 `.env`，通过 `env.ts` 加载到 Hono 进程
- 开发数据库通过 `docker/docker-compose.dev.yml` 启动，读根 `.env` 的端口参数

## File Structure

```
packages/
  server/            # Backend (Hono + tRPC + Prisma)
    src/
      env.ts         # dotenv loading (MUST be first import in main.ts)
      db/client.ts   # Prisma client (PrismaPg adapter)
      db/redis.ts    # Redis client (reads REDIS_PORT)
      trpc/
        init.ts      # tRPC initialization, publicProcedure, protectedProcedure
        context.ts   # Request context (cookie-based auth)
        middlewares.ts # workspaceProtectedProcedure, adminProcedure, superAdminProcedure
        router.ts    # appRouter — registers all module routers
        errors.ts    # AppError factories (notFound, badRequest, etc.)
      modules/
        auth/        # Login, register, logout, rate limiting
        user/        # Profile, password, avatar
        workspace/   # Workspace CRUD, membership
        admin/       # System settings, user mgmt, invitation codes
        wechat/      # WeChat miniapp authentication
        upload/      # Avatar file upload (Hono HTTP routes)
      utils/
        session.ts   # Cookie-based session management
        request-auth.ts # Auth resolution from cookies
      storage/       # S3-compatible storage provider
      logger.ts      # Consola-based logger
    prisma/
      schema.prisma  # Database schema

  web/               # Frontend (React Router v7 SSR)
    src/
      root.tsx       # Root layout with Providers
      routes.ts      # Route configuration
      routes/        # Route modules
        home/        # Landing page
        login/       # Auth pages
        register/
        dashboard/   # Dashboard with workspace context
          $workspace/
            $page/
      components/    # Business components (use tRPC, contain logic)
        auth/        # Login/register forms
        dashboard/   # Dashboard layout, sidebar
        account/     # User settings
        admin/       # Admin panel components
      hooks/         # React custom hooks
      lib/
        trpc.ts      # tRPC client setup
        i18n.ts      # i18next configuration
        preferences.ts # Cookie-based theme/lang persistence
        avatar.ts    # resolveAvatarUrl() helper
    server.mjs       # Bun-based SSR server (proxies /trpc, /upload)
    react-router.config.ts

  components/        # Generic UI components (no business logic)
    src/
      styles/tokens.css  # CSS variables (light/dark design tokens)
      cn.ts          # className merge utility
      Avatar.tsx, Button.tsx, Checkbox.tsx, Divider.tsx, Drawer.tsx,
      Dropdown.tsx, FormField.tsx, Input.tsx, Modal.tsx, Radio.tsx,
      Select.tsx, Sidebar.tsx, Spinner.tsx, Switch.tsx, Tabs.tsx,
      Tag.tsx, TextArea.tsx, Toast.tsx, Tooltip.tsx, ...

  i18n/              # i18n locale resources
    src/locales/
      zh/            # Chinese translations
      en/            # English translations

  types/             # Shared types & Zod schemas
    src/
      user.ts, workspace.ts, admin.ts, api.ts, index.ts

  miniapp/           # WeChat Mini Program (Taro 4)
```

## 技术约束

- **禁止**：`any`、Prettier / ESLint、Ant Design / @ant-design/icons / 第三方 UI 框架
- **必须**：`lucide-react`（图标）、Biome（lint）、`toXxxOutput()`（禁止直接暴露 Prisma 模型）
- **Zod v4** only（not v3 — API differs）
- Every tRPC procedure must have `.input()` + `.output()` Zod schemas
- Single file ≤ 500 lines
- **交互**：所有可点击元素必须设置 `cursor-pointer`（`<button>` 通过全局样式或 Tailwind class，自定义可点击 `<div>` / `<span>` 必须显式添加 `cursor-pointer`）

## Architecture Patterns

### tRPC Procedure Chain

| Procedure | Use case |
|-----------|----------|
| `publicProcedure` | No auth required |
| `protectedProcedure` | Requires `ctx.userId` (cookie-based session) |
| `workspaceProtectedProcedure` | Requires workspace membership |
| `adminProcedure` | Requires admin or superadmin role |
| `superAdminProcedure` | Requires superadmin role only |

### Cookie-Based Sessions

Authentication uses HTTP-only cookies (`SESSION_ID`), not JWT tokens:
- `setSessionCookie(resHeaders, sessionId)` — set on login/register
- `clearSessionCookie(resHeaders)` — clear on logout
- `resolveRequestAuth(headers)` — extract userId from cookie in tRPC context

### CSS Variables Theming

Design tokens defined in `packages/components/src/styles/tokens.css` with `:root` and `.dark` variants.
Theme toggling via `document.documentElement.classList.add/remove("dark")`.
User preference stored in cookies (`themeMode`, `langMode`).

### Error Handling

All `AppError` factories require two args: `(language: Language, i18nKey: string)`:

```typescript
throw AppError.notFound(ctx.language, "errors.user.notFound");
throw AppError.badRequest(ctx.language, "errors.auth.invalidCredentials");
throw AppError.unauthorized(ctx.language, "errors.common.unauthorized");
throw AppError.forbidden(ctx.language, "errors.common.adminRequired");
```

### Storage / File URL Rules

Backend stores **file keys** only (e.g. `userId/1234.jpg`), never full URLs.
- `StorageProvider.uploadFile()` returns `void` — no URL returned from storage layer
- Backend API responds with `key`, never full URLs
- Frontend resolves full URLs via `resolveAvatarUrl(key)` using `VITE_STORAGE_PUBLIC_URL` env var

```typescript
import { resolveAvatarUrl } from "@/lib/avatar";
<Avatar url={resolveAvatarUrl(user.settings?.avatarKey)} />
```

## Admin Module

The project includes a comprehensive admin system with role-based access control:

### Roles

| Role | Access | Description |
|------|--------|-------------|
| `superadmin` | Full system access | Manage users, roles, settings, invitation codes |
| `admin` | System settings | View/update system settings |
| `user` | Standard access | Regular user, no admin features |

### Features

- **System Settings**: `allowRegistration`, `singleWorkspaceMode` (admin + superadmin via `adminProcedure`)
- **User Management**: List, create, delete users, force reset passwords (superadmin only via `superAdminProcedure`)
- **Role Management**: Update user roles between user/admin/superadmin (superadmin only)
- **Invitation Codes**: Generate, list, delete invitation codes for controlled registration (superadmin only)
- **Types**: `packages/types/src/admin.ts` — AdminUser, SystemSettings, InvitationCode schemas
- **i18n**: `packages/i18n/src/locales/admin/` — admin-specific translations
- **Frontend**: Admin components in `packages/web/src/components/admin/`

## Git 操作约束

- **禁止**使用 `git stash` / `git stash pop` 等任何 stash 相关命令

## 破坏性操作约束

- **禁止直接执行** `make init`、数据库 reset、`DROP`、`rm -rf .data/`、`docker-compose down -v` 等任何会销毁数据库数据的命令
- **验证代码改动时只读代码，不要跑破坏性命令来"测试"**
- 如果确实必须运行涉及数据库的操作，**必须先备份**：`docker exec apps-postgres pg_dump -U postgres -d app > /tmp/backup_pre_test.sql`
- **绝对禁止**停止、重启或修改其他项目的 Docker 容器

## 全局安装约束

- **绝对禁止**自动给用户全局安装任何软件包、二进制或库文件（包括但不限于 `~/.local/`、`/usr/local/`、系统包管理器、pip install --user 等）
- **绝对禁止**修改用户的 shell 配置文件（`~/.bashrc`、`~/.zshrc`、`~/.profile` 等）
- 如果编译或运行缺少系统依赖，**只告知用户需要安装什么**，由用户自行决定安装方式
- 项目依赖通过包管理器（pnpm）管理，不涉及全局安装

## 端到端测试（Chrome DevTools MCP）

前端改动必须通过浏览器实际验证，使用 Chrome DevTools MCP 工具进行端到端测试：

### 测试流程

1. **截图确认当前状态**：`chrome-devtools-take_screenshot`（JPEG quality=60 即可）
2. **获取页面结构**：`chrome-devtools-take_snapshot` 获取 a11y 树，找到目标元素的 `uid`
3. **交互操作**：
   - 点击：`chrome-devtools-click` (uid)
   - 悬停：`chrome-devtools-hover` (uid)
   - 输入：`chrome-devtools-fill` (uid, value)
   - 按键：`chrome-devtools-press_key` (key)
4. **截图验证结果**：操作后再次截图确认 UI 变化
5. **检查控制台错误**：`chrome-devtools-list_console_messages`（types: ["error", "warn"]）

### React 状态检查

```javascript
// 通过 React Fiber 读取组件状态
const el = document.querySelector('目标元素');
const fiberKey = Object.keys(el).find(k => k.startsWith('__reactFiber'));
const fiber = el[fiberKey];
// 遍历 fiber.return 查找父组件，fiber.memoizedState 查找 hook 状态
```

### 注意事项

- **不要直接启动 dev server**，前后端由用户持续运行
- 检查 dev server 是否加载最新代码：查看终端输出或浏览器 console
