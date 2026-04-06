# Deployment Guide

本文档提供部署流程概览。详细的步骤指南请参考 [DEPLOY.md](../DEPLOY.md)。

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
            └── npm install -g prisma@6
```

输出镜像：`ohmywrt-toolbox-server:latest`

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
| `./{DATA_LOCAL_PATH}/server` | 应用数据（上传文件等） |

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

### `docker/.env`（生产环境）

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `POSTGRES_USER` | `postgres` | 数据库用户名 |
| `POSTGRES_PASSWORD` | — | 数据库密码（**必须修改**） |
| `POSTGRES_DB` | `ohmywrt_toolbox_db` | 数据库名 |
| `WEB_PORT` | `8080` | 前端+后端对外端口 |
| `DATA_LOCAL_PATH` | `data` | 数据存储目录 |
| `ALLOW_INSECURE_VALIDATION` | `false` | 配置校验安全：禁止在无沙箱时降级执行二进制 |

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

## 部署步骤摘要

1. **本地构建**：`make docker`
2. **导出镜像**：`docker save ohmywrt-toolbox-server:latest -o ohmywrt-toolbox-docker-images.tar`
3. **上传到服务器**：`scp ohmywrt-toolbox-docker-images.tar <server>:/path/`
4. **加载镜像**：`docker load -i ohmywrt-toolbox-docker-images.tar`
5. **上传配置**：`docker-compose.yml` + `.env`
6. **启动服务**：`docker compose up -d`
7. **初始化数据库**（首次）：`docker exec ohmywrt-toolbox-server npx prisma db push`
8. **验证**：`docker compose ps` + `docker compose logs`

详细步骤见 [DEPLOY.md](../DEPLOY.md)。

## 健康检查与监控

### 日志查看

```bash
# 查看所有服务日志
docker compose logs --tail=50

# 实时跟踪
docker compose logs -f

# 仅查看后端日志
docker compose logs --tail=100 server
```

### 容器状态

```bash
docker compose ps
```

### 数据库连接测试

```bash
docker exec ohmywrt-toolbox-postgres pg_isready -U postgres
```

### 进入容器调试

```bash
# 后端容器
docker exec -it ohmywrt-toolbox-server sh

# 数据库容器
docker exec -it ohmywrt-toolbox-postgres psql -U postgres -d ohmywrt_toolbox_db
```

### 启动验证

后端启动时会在日志中打印 banner，包含版本号、git commit 和构建时间。确认这些信息与预期一致，即可验证部署的代码版本正确。

## 更新部署

```bash
# 1. 本地重新构建
make docker

# 2. 导出并上传
docker save ohmywrt-toolbox-server:latest -o ohmywrt-toolbox-docker-images.tar
scp ohmywrt-toolbox-docker-images.tar <server>:/path/

# 3. 服务器端加载并重启
ssh <server> "docker load -i /path/ohmywrt-toolbox-docker-images.tar && \
  cd /mnt/docker/apps && \
  docker compose up -d"
```

## 默认账号

首次部署并初始化数据库后，可使用以下账号登录：

| 邮箱 | 密码 | 角色 |
|------|------|------|
| admin@example.com | password | 超级管理员 |
| user@example.com | password | 普通用户 |
