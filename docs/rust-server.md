# Rust Backend Guide

`packages/server/` 是基于 Axum 的 HTTP 服务器骨架，使用 Sea-ORM 连接 PostgreSQL。作为 Cargo workspace 的成员，继承根 `Cargo.toml` 中的 lint 规则和 build profiles。

## Cargo Workspace 集成

Server crate 通过 `[lints] workspace = true` 继承 workspace 级别的 clippy + rustc lint 规则，无需在自己的 `Cargo.toml` 中重复定义。

Build profiles（dev/test/release）同样继承自 workspace，确保所有 crate 使用一致的编译配置。

## 项目结构

```
packages/server/
├── src/
│   ├── main.rs          # 服务器入口
│   ├── lib.rs           # AppState 定义 + 模块导出
│   ├── error.rs         # AppError enum → JSON response
│   ├── logging.rs       # 自定义日志格式化器
│   ├── build_info.rs    # 版本 / commit / 构建时间
│   ├── router/
│   │   ├── mod.rs       # 路由合并 + CORS + 中间件 + SPA fallback
│   │   └── cors.rs      # CORS 配置
│   └── middleware/
│       └── mod.rs       # 请求超时中间件
├── build.rs             # 编译时嵌入 git commit + 构建时间
├── Cargo.toml           # 依赖配置
├── Dockerfile           # 多阶段构建（Node builder → Rust binary）
├── dev-run.sh           # 开发启动脚本
└── dev-watch.sh         # 文件监听自动重编译
```

## AppState

```rust
// lib.rs
pub struct AppState {
    pub db: DatabaseConnection,
}
```

`AppState` 是 Axum 的共享状态，通过 `Arc<AppState>` 在所有 handler 间共享。

### 扩展 AppState

添加新的共享资源时，在 `lib.rs` 中扩展 `AppState` struct：

```rust
pub struct AppState {
    pub db: DatabaseConnection,
    pub redis: redis::Client,       // 新增
    pub config: AppConfig,          // 新增
}
```

然后在 `main.rs` 的 `async_main()` 中初始化并传入 `Arc::new(AppState { ... })`。

## 添加新路由

### 1. 创建 handler 模块

```rust
// src/routes/health.rs
use axum::{extract::State, Json};
use std::sync::Arc;

use crate::{error::ApiResponse, AppState};

pub async fn health_check(
    State(state): State<Arc<AppState>>,
) -> Json<ApiResponse<String>> {
    // 验证数据库连接
    Json(ApiResponse {
        success: true,
        data: Some("ok".to_string()),
        error: None,
    })
}
```

### 2. 注册路由

在 `router/mod.rs` 中添加路由：

```rust
use crate::routes::health;

pub fn build_app(state: Arc<AppState>) -> Router {
    let api = Router::new()
        .route("/api/health", get(health::health_check))  // 新增
        .layer(cors::build_cors_layer())
        .layer(middleware::from_fn(request_timeout))
        .with_state(state);

    // SPA fallback ...
}
```

### 3. 导出模块

在 `lib.rs` 中添加：

```rust
pub mod routes;  // 新增
```

## 错误处理

### AppError enum

```rust
pub enum AppError {
    NotFound(String),      // → 404
    Unauthorized(String),  // → 401
    BadRequest(String),    // → 400
    Forbidden(String),     // → 403
    Conflict(String),      // → 409
    Internal(String),      // → 500
    Database(sea_orm::DbErr), // → 500（日志记录原始错误，返回通用消息）
}
```

### 使用方式

在 handler 中返回 `Result<Json<ApiResponse<T>>, AppError>`：

```rust
pub async fn get_user(
    State(state): State<Arc<AppState>>,
    Path(user_id): Path<String>,
) -> Result<Json<ApiResponse<UserOutput>>, AppError> {
    let user = User::find_by_id(&user_id)
        .one(&state.db)
        .await
        .map_err(AppError::Database)?
        .ok_or_else(|| AppError::NotFound("用户不存在".to_string()))?;

    Ok(Json(ApiResponse {
        success: true,
        data: Some(to_user_output(user)),
        error: None,
    }))
}
```

### 响应格式

成功：
```json
{ "success": true, "data": { ... } }
```

失败：
```json
{ "success": false, "error": "error message" }
```

`Database` 变体特殊处理：日志记录原始 `DbErr`，但对客户端返回 `"Internal database error"`，避免泄露数据库细节。

## 日志系统

### PrettyFormatter

`logging.rs` 提供自定义的 `PrettyFormatter`：

- **SQL 查询日志**（`sqlx::query` 事件）：
  - 仅显示耗时 > 10ms 的查询
  - 格式：`时间 关键字(着色) 表名 行数 耗时 来源位置`
  - SQL 关键字（SELECT / INSERT / UPDATE / DELETE）使用不同颜色

- **普通日志**：
  - 格式：`时间(dim) 级别 模块 消息`
  - 时间戳使用本地时间

### 日志级别配置

优先级：`RUST_LOG` > `LOG_LEVEL` > 默认（info）

开发模式下 `dev-run.sh` 默认设置 `RUST_LOG=debug`，并过滤掉噪声源：

```
debug,hyper=info,h2=info,tower=info,rustls=info
```

## ts-rs 类型导出

### 工作流

1. 在 Rust struct 上添加 `#[derive(TS)]` 和 `#[ts(export)]`：

```rust
use ts_rs::TS;
use serde::Serialize;

#[derive(Serialize, TS)]
#[ts(export)]
pub struct UserOutput {
    pub id: String,
    pub name: String,
    pub email: String,
    pub role: String,
}
```

2. 运行 `make gen:api`（或在 `dev-run.sh` 中自动执行）：

```bash
TS_RS_EXPORT_DIR="packages/web/src/generated/rust-types" cargo test --lib
```

3. 生成的 `.ts` 文件出现在 `packages/web/src/generated/rust-types/`。

4. 在前端 API hooks 中引用生成的类型：

```typescript
import type { UserOutput } from "@/generated/rust-types/UserOutput";
```

### 注意事项

- `ts-rs` 通过 `cargo test` 触发导出（不是 `cargo build`）
- 每次修改 Rust DTO 后需重新运行 `make gen:api`
- `dev-run.sh` 在后台自动运行类型导出

## 构建信息

### build.rs

编译时通过 `build.rs` 嵌入以下信息：

| 环境变量 | 内容 | 来源 |
|---------|------|------|
| `APPS_WORKSPACE_ROOT` | 工作区根路径 | `CARGO_MANIFEST_DIR` 的父级 |
| `APPS_GIT_COMMIT` | 短 git hash（12 字符） | `git rev-parse --short=12 HEAD` |
| `APPS_BUILD_TIME` | 构建时间戳 | `date "+%Y-%m-%d %H:%M:%S"` |
| `RUSTC_VERSION` | rustc 版本 | `rustc --version` |

### 启动 Banner

`build_info.rs` 的 `startup_banner()` 生成带颜色渐变（amber-400 → red-500）的 ASCII art logo，附带版本信息：

```
  █████   ██████  ███    ███ ███████
 ██   ██ ██       ████  ████ ██
 ███████ ██       ██ ████ ██ █████
 ██   ██ ██       ██  ██  ██ ██
 ██   ██  ██████  ██      ██ ███████

  v0.1.0 · abc123def456 · built 2025-01-01 12:00:00
```

## 开发与构建

### 开发模式

```bash
# 通过 make dev 自动启动（推荐）
make dev

# 或手动启动
cd packages/server
./dev-watch.sh   # 文件监听 + 自动重编译
```

**`dev-run.sh`** 流程：
1. 加载根 `.env` + 本地 `.env`
2. 解析 `DATA_LOCAL_PATH` 为绝对路径
3. `cargo build`（debug 模式）
4. 后台运行 ts-rs 类型导出
5. 启动 `ohmywrt-toolbox-server --listen 0.0.0.0:5678`

**`dev-watch.sh`** 文件监听：
- 优先使用 `watchexec`（推荐）
- 备选 `cargo watch`
- 监听 `.rs`、`.toml`、`.env` 文件变化
- 变化时自动调用 `dev-run.sh` 重编译重启

### 生产构建

```bash
# Release 编译
cd packages/server
cargo build --release

# 输出：target/release/ohmywrt-toolbox-server
```

### Docker 构建

```bash
make docker
```

流程：
1. `cargo build --release`（宿主机编译 Rust 二进制）
2. `docker build -f packages/server/Dockerfile`（多阶段构建）

### Dockerfile 多阶段

| 阶段 | 基础镜像 | 职责 |
|------|---------|------|
| **web-builder** | node:20-alpine | 安装 pnpm → 构建 i18n / types / components / web |
| **最终镜像** | node:20-trixie-slim | 复制 Rust 二进制 + 前端静态文件 + Prisma schema |

最终镜像包含：
- `/usr/local/bin/ohmywrt-toolbox-server` — Rust 二进制
- `/app/web` — 前端静态文件（`STATIC_DIR` 环境变量指向）
- Prisma CLI（用于 `npx prisma db push`）

### 关键依赖

| 依赖 | 版本 | 用途 |
|------|------|------|
| axum | 0.8 | HTTP 框架（JSON / multipart / WebSocket） |
| tokio | 1 | 异步运行时 |
| sea-orm | 1.1 | ORM（PostgreSQL + UUID + JSON + chrono） |
| tower-http | 0.6 | CORS / 静态文件 / gzip+br 压缩 |
| ts-rs | 12 | Rust → TypeScript 类型导出 |
| serde | 1 | 序列化/反序列化 |
| clap | 4 | CLI 参数解析 |
| argon2 | 0.5 | 密码哈希 |
| tracing | 0.1 | 结构化日志 |
| dotenvy | 0.15 | `.env` 文件加载 |
| tikv-jemallocator | 0.6 | 高性能内存分配器（非 MSVC） |
