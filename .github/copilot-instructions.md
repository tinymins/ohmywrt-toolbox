# ACME Stack

**全栈 Web 应用脚手架** — pnpm monorepo，Rust 后端 + React 前端，端到端类型安全。

**技术栈**：pnpm monorepo · React 19 + Tailwind CSS v4 · Rust (Axum) 后端 · PostgreSQL + Sea-ORM · TypeScript 端到端类型安全

**端口**：前端 `5173`，后端 `5678`。不要直接启动前后端，dev server 由用户持续运行，验证时告知用户在已运行的 dev server 上检查。

## 包结构

| 层 | 包 | 说明 |
|---|---|---|
| 后端 | `packages/server/` | Axum + Sea-ORM + PostgreSQL |
| WASM | `packages/wasm/` | WebAssembly 模块（浏览器端计算） |
| 前端 | `@acme/web` · `packages/web/` | React 19 + Vite + TanStack Query v5 |
| UI 组件 | `@acme/components` · `packages/components/` | Tailwind + Lucide，无第三方 UI 框架 |
| 国际化 | `@acme/i18n` · `packages/i18n/` | 5 种语言（zh-CN / en-US / de-DE / ja-JP / zh-TW） |
| 类型 | `@acme/types` · `packages/types/` | 共享 Zod v4 schemas + TypeScript 类型 |
| 小程序 | `packages/miniapp/` | Taro 4 + React + 微信小程序 |

**前端类型来源：**
- Rust DTO → `packages/web/src/generated/rust-types/`（由 ts-rs 自动生成，`make gen:api`）
- 共享业务类型 → `packages/types/`（Zod v4 schemas）
- 前端 REST API hooks → `packages/web/src/generated/rust-api/`

## CI 命令

```bash
make lint        # Biome lint + typecheck（修改后必须通过）
make db:sync     # Prisma DB push（schema 变更后运行）
make gen:api     # 从 Rust 生成 TypeScript 类型（修改 Rust DTO 后运行）
make build       # 编译生产版本（Rust + 前端）
make docker      # 构建 Docker 镜像
```

- **每次代码修改完成后必须运行 `make lint`**，确认 lint + typecheck 全部通过后才算完成任务

### 数据库

```sh
make db:sync                                    # 同步 schema 到 DB（prisma db push）
npx prisma db push --schema prisma/schema.prisma  # 手动推送 schema
docker exec rs-fullstack-postgres psql -U postgres -d rs_fullstack_db -c "SQL"  # 查询数据库
```

## 环境变量配置

| 文件 | 用途 | 消费者 |
|------|------|--------|
| `.env` | 开发总控：数据库连接 + 功能开关 | Prisma CLI · Rust 后端 · Makefile · dev 数据库容器 |
| `docker/.env` | 生产环境配置 | `docker/docker-compose.yml`（生产全量部署） |
| `packages/web/.env` | 前端技术配置 | Vite（RUST_SERVER） |
| `packages/server/.env` | 后端技术配置 | Rust 进程（LOG_LEVEL） |

- DATABASE_URL 统一在根 `.env`，不要在子包 `.env` 中重复定义
- 开发数据库通过 `docker/docker-compose.dev.yml` 启动，读根 `.env` 的 POSTGRES_* 参数

## 文件结构

```
packages/
  server/         # Backend (Rust + Axum + Sea-ORM)
    src/
      main.rs          # Axum 服务器入口（tokio runtime + CLI args）
      lib.rs           # AppState 定义 + 模块导出
      error.rs         # AppError enum → JSON response
      logging.rs       # 自定义日志格式化器（SQL 着色）
      build_info.rs    # 版本 / commit / 构建时间
      router/
        mod.rs         # 路由合并 + CORS + 超时中间件 + SPA 静态文件
        cors.rs        # CORS 配置
      middleware/
        mod.rs         # 请求超时中间件（300s，排除 /stream /sse /ws）
    build.rs           # git commit + 构建时间嵌入
    Cargo.toml         # 依赖：axum, sea-orm, ts-rs, tower-http, serde
    Dockerfile         # 多阶段：Node builder → Rust binary + 前端静态文件
    dev-run.sh         # 开发启动脚本（cargo build + ts-rs 导出）
    dev-watch.sh       # 文件监听自动重编译（watchexec / cargo-watch）

  wasm/                # WASM 模块（浏览器端计算）
    src/lib.rs         # wasmVersion / wasmGitCommit / wasmBuildTime
    Cargo.toml         # wasm-bindgen, cdylib
    package.json       # wasm-pack build scripts

  web/                 # Frontend (React 19 + Vite)
    src/
      root.tsx         # Root layout with QueryClientProvider + ErrorDisplayContext
      routes/          # Route modules
      components/      # Business components (use REST API hooks)
      hooks/           # React custom hooks
      lib/
        rust-api-runtime.ts  # createQuery / createMutation 工厂
        server-base.ts       # DEV_SERVER base URL
        error-display.ts     # ErrorDisplayContext
        i18n.ts              # i18next 配置
        preferences.ts       # Cookie-based theme/lang persistence
      generated/
        rust-api/      # REST API hooks (auth, user, workspace, admin)
        rust-types/    # ts-rs 自动生成的 TypeScript 类型
    vite.config.ts     # /api + /upload + /storage 代理到 :5678

  components/          # Generic UI components (no business logic)
    src/
      styles/tokens.css  # CSS 设计变量（light/dark）

  i18n/                # i18n 资源（5 种语言）
    src/locales/{zh-CN,en-US,de-DE,ja-JP,zh-TW}/

  types/               # Shared Zod v4 schemas + TypeScript types
    src/user.ts, workspace.ts, admin.ts, api.ts

  miniapp/             # WeChat Mini Program (Taro 4)
```

## 技术约束

- **禁止**：`any`、Prettier / ESLint、Ant Design / 第三方 UI 框架
- **必须**：`lucide-react`（图标）、Biome（lint）、`toXxxOutput()`（禁止直接暴露数据库模型）
- **Zod v4** only（not v3 — API differs）
- Single file ≤ 500 lines
- **交互**：所有可点击元素必须设置 `cursor-pointer`（`<button>` 通过全局样式或 Tailwind class，自定义可点击 `<div>` / `<span>` 必须显式添加 `cursor-pointer`）

## 架构模式

### REST API 模式

前端通过 `rust-api-runtime.ts` 调用 Rust 后端 REST API：

```typescript
// packages/web/src/generated/rust-api/user.ts
import { createQuery, createMutation } from "@/lib/rust-api-runtime";

export const userApi = {
  getProfile: createQuery<void, User>({ path: "/api/user/profile" }),
  updateProfile: createMutation<UserUpdateInput, User>({ method: "PATCH", path: "/api/user/profile" }),
};

// 组件中使用
const { data: user } = userApi.getProfile.useQuery();
const mutation = userApi.updateProfile.useMutation();
```

### Rust 后端响应格式

```json
// 成功
{ "success": true, "data": { ... } }
// 失败
{ "success": false, "error": "error message" }
```

### AppError 类型（Rust）

```rust
pub enum AppError {
    NotFound(String),      // 404
    Unauthorized(String),  // 401
    BadRequest(String),    // 400
    Forbidden(String),     // 403
    Conflict(String),      // 409
    Internal(String),      // 500
    Database(sea_orm::DbErr), // 500
}
```

### CSS Variables Theming

Design tokens defined in `packages/components/src/styles/tokens.css` with `:root` and `.dark` variants.
Theme toggling via `document.documentElement.classList.add/remove("dark")`.
User preference stored in cookies (`themeMode`, `langMode`).

### Docker 架构

2 容器部署：
- `rs-fullstack-postgres` — PostgreSQL 数据库
- `rs-fullstack-server` — Rust 二进制（内嵌前端静态文件 + Prisma migration）

### 版本与构建时间

后端和前端均在编译时嵌入版本号、git commit、构建时间，用于确认 dev server 是否已加载最新代码。

**后端**：启动时在控制台打印 banner（版本 + commit + 构建时间）。

**前端**：WASM 包提供 `wasmVersion()` / `wasmGitCommit()` / `wasmBuildTime()`。

## Git 操作约束

- **禁止**使用 `git stash` / `git stash pop` 等任何 stash 相关命令

## 破坏性操作约束

- **禁止直接执行** `make init`、数据库 reset、`DROP`、`rm -rf .data/`、`docker-compose down -v` 等任何会销毁数据库数据的命令
- **验证代码改动时只读代码，不要跑破坏性命令来"测试"**
- 如果确实必须运行涉及数据库的操作，**必须先备份**：`docker exec rs-fullstack-postgres pg_dump -U postgres -d rs_fullstack_db > .data/backup_pre_test.sql`
- **绝对禁止**停止、重启或修改其他项目的 Docker 容器
- Makefile 中每个 `@` 行是独立 shell，`exit 0` 不会停止后续行执行，取消逻辑必须用 `exit 1`

## 全局安装约束

- **绝对禁止**自动给用户全局安装任何软件包、二进制或库文件（包括但不限于 `~/.local/`、`/usr/local/`、系统包管理器、pip install --user 等）
- **绝对禁止**修改用户的 shell 配置文件（`~/.bashrc`、`~/.zshrc`、`~/.profile` 等）
- 如果编译或运行缺少系统依赖，**只告知用户需要安装什么**，由用户自行决定安装方式
- 项目依赖通过包管理器（pnpm / cargo）管理，不涉及全局安装

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
- WASM 修改后必须手动 rebuild：`cd packages/wasm && wasm-pack build --release --target bundler --out-dir pkg`
- 检查 dev server 是否加载最新代码：查看终端输出或浏览器 console
