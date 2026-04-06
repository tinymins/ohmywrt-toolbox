# System Architecture Overview

OhMyWRT Toolbox 是一个代理订阅管理平台，采用 pnpm monorepo 管理，Rust 后端 + React 前端，端到端类型安全。

## 业务功能文档

| 文档 | 说明 |
|------|------|
| [代理订阅管理系统](proxy-subscription-system.md) | 核心业务：订阅聚合、格式转换、公开分享 |
| [节点数据丢失追踪](entropy-loss-detection.md) | 转换过程中的字段丢失检测机制 |
| [认证与用户系统](auth-and-user-system.md) | Session 认证、角色体系、用户管理 |
| [工作空间与多租户](workspace-system.md) | 工作空间隔离、成员管理、单工作空间模式 |
| [环境变量架构](env-architecture.md) | 分层 `.env` 加载、变量分类、Docker 环境 |
| [前端 API 模式](frontend-api.md) | REST API hooks、类型生成、错误处理 |
| [Rust 后端实现](rust-server.md) | Axum 服务器、Sea-ORM、日志、ts-rs |
| [开发环境搭建](development.md) | 本地开发、常用命令、调试技巧 |
| [部署指南](deployment.md) | Docker 构建、生产环境配置、更新流程 |

## 架构图

```
┌─────────────────────────────────┐
│         Browser (React)          │
│  ┌──────────┐ ┌──────────────┐  │
│  │ REST API │ │ WASM Module  │  │
│  │  hooks   │ │    (wasm)    │  │
│  └────┬─────┘ └──────────────┘  │
│       │ fetch(/api/*)            │
├───────┼─────────────────────────┤
│       ▼ Vite proxy (dev)        │
│  ┌──────────────────────────┐   │
│  │    Rust Server (Axum)    │   │
│  │  ┌────────┐ ┌─────────┐ │   │
│  │  │ Router │ │ Sea-ORM │ │   │
│  │  └────────┘ └────┬────┘ │   │
│  └───────────────────┼──────┘   │
│                      ▼          │
│  ┌──────────────────────────┐   │
│  │     PostgreSQL (DB)      │   │
│  └──────────────────────────┘   │
└─────────────────────────────────┘
```

## Monorepo 结构

项目使用 **pnpm workspaces + Turborepo** 管理多包依赖和构建顺序。

```
ohmywrt-toolbox/
├── packages/
│   ├── server/          # Rust 后端（Axum + Sea-ORM）
│   ├── wasm/            # WebAssembly 模块
│   ├── web/             # React 前端（Vite）
│   ├── components/      # 通用 UI 组件库
│   ├── i18n/            # 国际化资源（5 种语言）
│   ├── types/           # 共享 Zod v4 schemas + TypeScript 类型
│   └── miniapp/         # 微信小程序（Taro 4）
├── prisma/              # 数据库 schema
├── docker/              # Docker Compose 配置
├── scripts/             # 开发与部署脚本
│   ├── download-vendors.sh  # 统一下载校验用代理二进制
│   └── dev.sh               # 开发环境启动脚本
├── Makefile             # 构建命令入口
└── turbo.json           # Turborepo 流水线配置
```

### 包依赖关系

```
@acme/web ─────→ @acme/components ─→ (无外部依赖)
    │                │
    ├──→ @acme/types ←┘
    │
    ├──→ @acme/i18n
    │
    └──→ generated/rust-types/  (ts-rs 生成)
              ↑
            server (cargo test → ts-rs export)
```

## 后端：Rust / Axum

后端是一个基于 Axum 的 HTTP 服务器骨架，提供 REST API。

### 核心组件

| 组件 | 文件 | 职责 |
|------|------|------|
| **入口** | `main.rs` | tokio runtime 初始化、日志配置、数据库连接、HTTP 监听 |
| **状态** | `lib.rs` | `AppState { db: DatabaseConnection }` — 共享应用状态 |
| **路由** | `router/mod.rs` | 路由合并 + CORS + 超时中间件 + SPA 静态文件 fallback |
| **CORS** | `router/cors.rs` | CORS 配置（`CORS_ALLOWED_ORIGINS` 环境变量或默认 localhost:5173） |
| **错误** | `error.rs` | `AppError` enum → HTTP status + JSON `{ success, error }` |
| **中间件** | `middleware/mod.rs` | 请求超时（默认 300s，排除 /stream /sse /ws） |
| **日志** | `logging.rs` | `PrettyFormatter` — SQL 查询着色，仅显示 >10ms 的查询 |
| **构建信息** | `build_info.rs` | 版本号、git commit、构建时间、启动 banner |

### 数据库

- **Schema 定义**：`prisma/schema.prisma`（Prisma 用于 schema 管理和 migration）
- **运行时 ORM**：Sea-ORM（Rust 端查询、事务、连接池）
- **数据库**：PostgreSQL（开发环境通过 `docker/docker-compose.dev.yml` 启动）

### 请求/响应格式

所有 API 返回统一的 JSON 格式：

```json
// 成功
{ "success": true, "data": { ... } }

// 失败
{ "success": false, "error": "error message" }
```

### Jemalloc

非 MSVC 目标使用 tikv-jemallocator 作为全局分配器，提升高并发场景的内存分配性能。

## 前端：React 19 + Vite

前端使用 React 19 + Vite 构建，通过 REST API hooks 与 Rust 后端通信。

### 核心组件

| 组件 | 文件 | 职责 |
|------|------|------|
| **根布局** | `root.tsx` | Provider 栈：QueryClient + ErrorDisplay + I18n + Theme + Auth |
| **API 运行时** | `lib/rust-api-runtime.ts` | `createQuery` / `createMutation` 工厂函数 |
| **服务地址** | `lib/server-base.ts` | `DEV_SERVER` — 开发环境后端 URL |
| **错误展示** | `lib/error-display.ts` | `ErrorDisplayContext` — 全局错误提示 |
| **偏好设置** | `lib/preferences.ts` | Cookie 持久化主题 / 语言设置 |

### Vite 代理

开发环境下，Vite 代理以下路径到 Rust 后端（端口 5678）：

- `/api/*` — REST API
- `/upload/*` — 文件上传
- `/storage/*` — 静态资源

生产环境下，前端静态文件由 Rust 服务器直接提供（SPA fallback）。

### 状态管理

- **服务端状态**：TanStack Query v5（通过 `createQuery` / `createMutation` hooks）
- **客户端状态**：React useState / useContext
- **持久化**：Cookie（主题、语言偏好）

## WASM 模块

`packages/wasm/` 提供浏览器端 WebAssembly 计算能力。

当前导出：
- `wasmVersion()` — 包版本号
- `wasmGitCommit()` — git commit hash
- `wasmBuildTime()` — 构建时间

通过 `wasm-bindgen` 暴露给 JavaScript，由 Vite 的 WASM 插件加载。

## 类型安全

项目通过多种机制实现端到端类型安全：

| 类型来源 | 生成方式 | 输出位置 |
|---------|---------|---------|
| Rust DTO | ts-rs (`cargo test` 时导出) | `packages/web/src/generated/rust-types/` |
| 共享业务类型 | 手动编写 Zod v4 schemas | `packages/types/src/` |
| REST API hooks | 手动编写（引用生成的类型） | `packages/web/src/generated/rust-api/` |

### ts-rs 工作流

1. Rust 代码中用 `#[derive(TS)]` 标注 DTO struct
2. `make gen:api` 运行 `cargo test` 导出 TypeScript 类型到 `generated/rust-types/`
3. `generated/rust-api/` 中的 hooks 引用这些类型

## Docker 架构

### 开发环境

```
docker/docker-compose.dev.yml
└── db (postgres:18) — 端口映射到 DB_PORT（默认 5432）
```

Rust 后端和前端 dev server 在宿主机上直接运行（不在 Docker 中）。

### 生产环境

```
docker/docker-compose.yml
├── ohmywrt-toolbox-postgres (postgres:18) — 仅 Docker 内网
└── ohmywrt-toolbox-server (ohmywrt-toolbox-server:latest) — 端口映射到 WEB_PORT（默认 8080）
    ├── Rust 二进制 (/usr/local/bin/ohmywrt-toolbox-server)
    ├── 前端静态文件 (/app/web)
    └── Prisma CLI (用于 db push)
```

### Dockerfile 多阶段构建

1. **Stage 1** (node:20-alpine)：构建前端（i18n → types → components → web）
2. **Stage 2** (node:20-trixie-slim)：复制预编译的 Rust 二进制 + 前端静态文件 + Prisma schema

注意：Rust 二进制在 `docker build` 之前通过 `cargo build --release` 预编译（不在 Docker 内编译）。

### Vendor 二进制（配置校验用）

容器启动时通过 `docker-entrypoint.sh` 调用 `scripts/download-vendors.sh` 自动下载校验用的代理软件二进制（Volume mount 覆盖构建时下载的文件，因此需在启动时重新下载）：

| 二进制 | 版本 | 容器内路径 | 用途 |
|--------|------|-----------|------|
| sing-box | v1.11.0 | `/app/data/vendors/sing-box-v11/sing-box` | Sing-box v11 格式校验 |
| sing-box | v1.12.25 | `/app/data/vendors/sing-box-v12/sing-box` | Sing-box v12 格式校验 |
| mihomo | v1.19.22 | `/app/data/vendors/mihomo/mihomo` | Clash/Clash-Meta 格式校验（预留） |

校验时通过 `unshare --user --net` 在用户+网络命名空间中执行二进制，实现无特权的网络隔离。Docker 环境需配合自定义 seccomp profile（`docker/seccomp.json`）放行 `unshare` syscall。

## 开发工作流

```
make dev
  ├── 启动 PostgreSQL 容器（docker-compose.dev.yml）
  ├── 启动 Rust 后端（dev-watch.sh → dev-run.sh）
  │     ├── cargo build（debug 模式）
  │     ├── ts-rs 类型导出（后台）
  │     └── ohmywrt-toolbox-server --listen 0.0.0.0:5678
  └── 启动 Vite dev server（端口 5173，代理 /api 到 :5678）
```

文件修改 → watchexec/cargo-watch 检测 → 自动重编译 → 重启服务器。

前端修改 → Vite HMR → 浏览器热更新。
