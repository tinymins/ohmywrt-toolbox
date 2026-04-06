# Deployment Guide

本文档提供部署流程概览。详细的步骤指南请参考 [DEPLOY.md](../DEPLOY.md)。

## 一键部署

```bash
make deploy    # 构建 → 导出 → 上传 → 部署 → 启动
```

首次部署需先配置 `scripts/.env` 和 `docker/.env`，详见 [DEPLOY.md](../DEPLOY.md)。

## 生产构建流程

```
make docker
  ├── cargo build --release          # 宿主机编译 Rust 二进制
  └── docker build -f Dockerfile     # 多阶段构建
        ├── Stage 1: node:20-alpine
        │   └── pnpm build (i18n → types → components → web)
        └── Stage 2: node:20-trixie-slim
            ├── COPY ohmywrt-toolbox-server binary
            ├── COPY frontend dist/
            ├── COPY download-vendors.sh + docker-entrypoint.sh
            └── npm install prisma@7
```

输出镜像：`ohmywrt-toolbox-server:latest`

### 容器启动流程

```
docker-entrypoint.sh
  ├── download-vendors.sh    # 下载 sing-box/mihomo（已存在则跳过）
  └── exec ohmywrt-toolbox-server   # 启动 Rust 服务器
```

> Volume mount `./${DATA_LOCAL_PATH}/server:/app/data` 覆盖构建时的 `/app/data`，因此 vendor 二进制需在启动时下载到持久化卷中。

## 容器架构

| 容器 | 镜像 | 端口 | 说明 |
|------|------|------|------|
| `ohmywrt-toolbox-postgres` | `postgres:18` | 不暴露（Docker 内网） | PostgreSQL 数据库 |
| `ohmywrt-toolbox-server` | `ohmywrt-toolbox-server:latest` | `WEB_PORT` → 5678 | Rust 后端 + 前端静态文件 |

### 网络

两个容器通过 `app-network`（bridge）互联。数据库仅在 Docker 内网可达，对外不暴露端口。

### 数据持久化

| 路径 | 用途 |
|------|------|
| `./{DATA_LOCAL_PATH}/postgres` | PostgreSQL 数据文件 |
| `./{DATA_LOCAL_PATH}/server` | 应用数据（上传文件、vendor 二进制等） |

### 安全：配置校验沙箱

配置校验在隔离的网络命名空间中执行第三方二进制，防止 RCE 攻击：

```bash
timeout 5s unshare --user --net -- sing-box check -c config.json
```

Docker 默认 seccomp profile 禁止 `unshare` syscall。通过自定义 seccomp profile（`docker/seccomp.json`）仅额外放行 `unshare` 一个 syscall，配合 `--user` 参数通过用户命名空间获得权限，无需给容器添加 `CAP_SYS_ADMIN`。

## 环境变量参考

### 根 `.env`（开发环境）

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/ohmywrt_toolbox_db` | 数据库连接串 |
| `POSTGRES_USER` | `postgres` | 数据库用户名 |
| `POSTGRES_PASSWORD` | `postgres` | 数据库密码 |
| `POSTGRES_DB` | `ohmywrt_toolbox_db` | 数据库名 |
| `DB_PORT` | `5432` | 数据库端口（开发环境暴露） |
| `DATA_LOCAL_PATH` | `.data` | 数据存储目录 |
| `ALLOW_INSECURE_VALIDATION` | `true` | 允许无沙箱时降级执行（开发环境） |

### `docker/.env`（生产环境）

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `POSTGRES_USER` | `postgres` | 数据库用户名 |
| `POSTGRES_PASSWORD` | — | 数据库密码（**必须修改**） |
| `POSTGRES_DB` | `ohmywrt_toolbox_db` | 数据库名 |
| `WEB_PORT` | `8080` | 前端+后端对外端口 |
| `DATA_LOCAL_PATH` | `data` | 数据存储目录 |
| `ALLOW_INSECURE_VALIDATION` | `false` | 配置校验安全：生产环境禁止无沙箱降级 |

### `packages/web/.env`

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `RUST_SERVER` | — | 开发环境后端 URL（如 `http://localhost:5678`） |

### `packages/server/.env`

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `LOG_LEVEL` | `info` | 日志级别 |
| `RUST_SOURCE_REQUEST_TIMEOUT_SECONDS` | `300` | 请求超时（秒） |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173` | CORS 允许的源（逗号分隔） |

## 健康检查与监控

```bash
./scripts/deploy.sh -l     # 查看日志
./scripts/deploy.sh -r     # 重启服务
./scripts/deploy.sh -e     # 检查 .env 配置更新
```

后端启动时会在日志中打印 banner，包含版本号、git commit 和构建时间。确认这些信息与预期一致，即可验证部署的代码版本正确。
