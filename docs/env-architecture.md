# 环境变量架构

## 设计原则

**分层加载**：业务配置集中在根 `.env`，技术栈配置在各包内 `.env`。

```
根 .env（业务/功能配置）
  ↑ 第二层加载（dotenvy 不覆盖已设置的变量）
packages/server/.env（技术栈配置）
  ↑ 第一层加载（优先级最高）
```

## 加载机制

`main.rs` 中使用 `dotenvy` 按顺序加载两层 `.env`：

```rust
// 1. 内层：技术栈配置（LOG_LEVEL 等）
dotenvy::dotenv().ok();

// 2. 外层：业务配置（DATABASE_URL, PUBLIC_SERVER_URL 等）
let workspace_root = env!("APPS_WORKSPACE_ROOT");
let root_env = std::path::Path::new(workspace_root).join(".env");
dotenvy::from_path(&root_env).ok();
```

`APPS_WORKSPACE_ROOT` 是编译时环境变量，在 `build.rs` 中通过 `CARGO_MANIFEST_DIR` 的父目录推导。

**`dotenvy` 特性**：不会覆盖已设置的环境变量。因此内层 `.env` 的同名变量优先。

## 变量分类

### 根 `.env`（业务配置）

| 变量 | 说明 |
|------|------|
| DATABASE_URL | PostgreSQL 连接串 |
| POSTGRES_USER / POSTGRES_PASSWORD / POSTGRES_DB | 数据库凭据 |
| DB_PORT | 数据库端口 |
| SERVER_PORT | 后端监听端口 |
| WEB_PORT | 前端开发端口 |
| DATA_LOCAL_PATH | 本地数据存储路径 |
| PUBLIC_SERVER_URL | 公开服务器地址（用于生成订阅链接） |
| SINGLE_WORKSPACE_MODE_OVERRIDE | 强制单工作空间模式 |
| ALLOW_INSECURE_VALIDATION | 允许配置校验在沙箱不可用时降级执行（开发 `true` / 生产 `false`） |
| CLASH_WS_URL | Clash API WebSocket 地址（规则测试用） |
| CLASH_WS_TOKEN | Clash API 认证 Token |

### `packages/server/.env`（技术栈配置）

| 变量 | 说明 |
|------|------|
| LOG_LEVEL | 日志级别 (trace/debug/info/warn/error) |

### `packages/web/.env`（前端配置）

| 变量 | 说明 |
|------|------|
| RUST_SERVER | Rust 后端地址（Vite 代理目标） |

## Docker 环境

容器内没有 `.env` 文件。所有变量通过 `docker-compose.yml` 的 `environment:` 注入：

```yaml
environment:
  DATABASE_URL: postgresql://...
  DATA_LOCAL_PATH: /data
  NODE_ENV: production
  PUBLIC_SERVER_URL: ${PUBLIC_SERVER_URL:-}
  SINGLE_WORKSPACE_MODE_OVERRIDE: ${SINGLE_WORKSPACE_MODE_OVERRIDE:-}
```

`dotenvy` 在容器内找不到 `.env` 文件时静默跳过，不影响运行。

## 注意事项

1. **禁止在内层 `.env` 放业务变量**——保持关注点分离
2. **`PUBLIC_SERVER_URL` 决定订阅链接中的域名**——生产环境必须设置为外部可访问地址
3. **`ALLOW_INSECURE_VALIDATION` 控制安全降级**——生产环境必须设为 `false`，禁止在无沙箱隔离的情况下执行第三方二进制
4. **所有 `.env` 文件都在 `.gitignore` 中**——不会提交到仓库
5. **`.env.example` 提供模板**——新部署时复制并修改
