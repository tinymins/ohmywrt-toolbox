# Development Setup

本文档介绍如何搭建本地开发环境。

## 前置要求

| 工具 | 最低版本 | 用途 |
|------|---------|------|
| **Node.js** | 20.19 / 22.12 | 前端构建、Prisma CLI |
| **pnpm** | 10.15.1 | 包管理器 |
| **Rust** | 见 `rust-toolchain.toml` | 后端编译 |
| **Docker** | — | 数据库容器 |
| **wasm-pack** | — | WASM 模块构建 |

### 可选工具

| 工具 | 用途 |
|------|------|
| **watchexec** | 文件监听自动重编译（推荐） |
| **cargo-watch** | 备选文件监听 |
| **mold** | 加速链接（可选） |
| **sccache** | 编译缓存（可选） |

## 首次初始化

```bash
make init
```

`make init` 执行以下步骤：

1. **检查依赖项** — 验证 node / pnpm / docker / cargo / wasm-pack 是否安装
2. **询问是否保留现有数据库** — 用户可选择跳过数据库清除（适用于重新安装依赖等场景）
3. **清理数据目录**（如选择重置）— 停止现有容器 + 删除 `${DATA_DIR}/postgres`
4. **创建数据目录** — `mkdir -p ${DATA_DIR}/postgres ${DATA_DIR}/storage`
5. **安装依赖** — `pnpm install`
6. **构建 WASM** — `cd packages/wasm && wasm-pack build --target web`
7. **启动数据库** — `docker compose -f docker/docker-compose.dev.yml up -d`
8. **等待数据库就绪** — `pg_isready` 检查
9. **同步 Schema** — `npx prisma db push --schema prisma/schema.prisma`

> 💡 `make init` 默认会询问是否保留现有数据库。选择保留时将跳过容器停止和数据清除步骤。

## 启动开发环境

```bash
make dev
```

`make dev` 调用 `scripts/dev.sh`，并行启动：

| 服务 | 端口 | 说明 |
|------|------|------|
| PostgreSQL | 5432 | Docker 容器（`docker-compose.dev.yml`） |
| Rust Server | 5678 | Axum HTTP 服务器（debug 模式） |
| Vite Dev | 5173 | React 前端 + HMR + 代理 |

### 开发工作流

```
代码修改
  ├── Rust 文件（.rs / .toml）
  │     → watchexec 检测 → cargo build → 重启 server
  │     → ts-rs 类型自动导出到 generated/rust-types/
  │
  ├── 前端文件（.tsx / .ts / .css）
  │     → Vite HMR → 浏览器热更新
  │
  └── Prisma schema
        → make db:sync → 同步到数据库
```

## 端口参考

| 服务 | 端口 | 环境变量 |
|------|------|---------|
| 前端 Dev Server | 5173 | `WEB_PORT` |
| Rust 后端 | 5678 | `--listen` 参数 |
| PostgreSQL | 5432 | `DB_PORT` |

## 常用命令速查

### 开发

```bash
make dev              # 启动完整开发环境
make dev:kill         # 杀掉残留进程（释放端口）
make lint             # Biome lint + Cargo clippy + TypeScript 类型检查
make gen:api          # 从 Rust 生成 TypeScript 类型
make db:sync          # 同步 Prisma schema 到数据库
```

### 构建

```bash
make build            # 编译生产版本（前端 + Rust）
make docker           # 构建 Docker 镜像
```

### 数据库

```bash
# 同步 schema
make db:sync
npx prisma db push --schema prisma/schema.prisma

# 查询数据库
docker exec ohmywrt-toolbox-postgres psql -U postgres -d ohmywrt_toolbox_db -c "SELECT * FROM users LIMIT 10;"

# 进入数据库 shell
docker exec -it ohmywrt-toolbox-postgres psql -U postgres -d ohmywrt_toolbox_db
```

### WASM

```bash
# 构建 WASM 模块
cd packages/wasm && wasm-pack build --target web

# Release 构建
cd packages/wasm && wasm-pack build --release --target bundler --out-dir pkg
```

### Vendor 二进制（配置校验）

```bash
# 手动下载/更新校验用代理二进制
sh scripts/download-vendors.sh

# 查看已下载的二进制
ls -la ${DATA_LOCAL_PATH}/vendors/*/
```

`pnpm install` 时通过 postinstall hook 自动运行（best-effort，失败不阻断安装）。

下载到 `DATA_LOCAL_PATH/vendors/` 目录（默认 `.data/vendors/`），包含：
- `sing-box-v11/sing-box` — v1.11.0
- `sing-box-v12/sing-box` — v1.12.25
- `mihomo/mihomo` — v1.19.22

脚本通过 `.version` 标记文件实现幂等——版本匹配时跳过下载。

### 类型生成

```bash
# 从 Rust DTO 生成 TypeScript 类型
make gen:api

# 手动运行（等效命令）
cd packages/server && TS_RS_EXPORT_DIR="../web/src/generated/rust-types" cargo test --lib
```

## 调试技巧

### Rust 后端

- **查看详细日志**：设置 `RUST_LOG=debug` 或 `LOG_LEVEL=debug`
- **SQL 查询日志**：PrettyFormatter 自动显示 >10ms 的 SQL 查询
- **跳过文件监听**：直接运行 `cd packages/server && ./dev-run.sh` 单次启动

### 前端

- **React DevTools**：浏览器扩展（查看组件树和状态）
- **Network 面板**：查看 REST API 请求/响应
- **Console 错误**：`RustApiError` 包含 HTTP 状态码和错误消息
- **TanStack Query DevTools**：监控查询状态和缓存

### 数据库

- **直接查询**：
  ```bash
  docker exec ohmywrt-toolbox-postgres psql -U postgres -d ohmywrt_toolbox_db -c "SQL"
  ```
- **Prisma Studio**（可选）：
  ```bash
  npx prisma studio --schema prisma/schema.prisma
  ```

### 确认代码版本

- **后端**：启动日志中的 banner 显示版本号、git commit 和构建时间
- **前端**：浏览器 console 中调用 `wasmVersion()` / `wasmGitCommit()` / `wasmBuildTime()`

## 环境变量文件

| 文件 | Git 跟踪 | 用途 |
|------|---------|------|
| `.env` | ❌ | 开发总控（数据库连接、功能开关） |
| `.env.example` | ✅ | `.env` 模板 |
| `docker/.env` | ❌ | 生产环境配置 |
| `docker/.env.example` | ✅ | 生产 `.env` 模板 |
| `packages/web/.env` | ❌ | 前端配置（`RUST_SERVER`） |
| `packages/server/.env` | ❌ | 后端配置（`LOG_LEVEL`） |

首次初始化时 `make init` 会自动从 `.env.example` 创建 `.env`。
