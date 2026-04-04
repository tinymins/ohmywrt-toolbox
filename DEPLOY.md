# 服务器部署指南

本文档描述如何从零开始将应用部署到服务器。

## 架构概览

生产环境仅包含 **2 个容器**：

| 容器 | 镜像 | 说明 |
|------|------|------|
| `rs-fullstack-postgres` | `postgres:18` | PostgreSQL 数据库 |
| `rs-fullstack-server` | `rs-fullstack-server:latest` | Rust 后端 + 内嵌前端静态文件 |

Server 二进制为 `rs-fullstack-server`，监听端口 **5678**，通过 Docker 映射到宿主机 `WEB_PORT`（默认 8080）。

## 前置要求

### 本地环境
- Node.js >= 20.19 或 >= 22.12
- pnpm >= 10.15.1
- Rust toolchain（见 `rust-toolchain.toml`）
- Docker

### 服务器环境
- Docker & Docker Compose
- SSH 访问权限

## 部署步骤

### 1. 本地构建 Docker 镜像

```bash
cd /path/to/project

# 构建 Rust 二进制 + Docker 镜像（含前端静态文件）
make docker
```

构建完成后生成一个镜像：
- `rs-fullstack-server:latest` — Rust 后端（内嵌前端静态文件）

### 2. 导出并上传镜像

```bash
# 导出镜像为 tar 文件
docker save rs-fullstack-server:latest -o rs-fullstack-docker-images.tar

# 上传到服务器
scp rs-fullstack-docker-images.tar <server>:/path/to/tmp/
```

### 3. 服务器端准备

SSH 登录服务器后执行：

```bash
# 创建部署目录
mkdir -p /mnt/docker/apps

# 加载 Docker 镜像
docker load -i /path/to/tmp/rs-fullstack-docker-images.tar

# 清理临时文件
rm /path/to/tmp/rs-fullstack-docker-images.tar
```

### 4. 上传配置文件

从本地上传配置文件：

```bash
# 上传 docker-compose.yml 和 debug 叠加文件
scp docker/docker-compose.yml <server>:/mnt/docker/apps/
scp docker/docker-compose.debug.yml <server>:/mnt/docker/apps/

# 上传环境变量文件（使用 docker/.env.example 作为模板）
scp docker/.env.example <server>:/mnt/docker/apps/.env
```

### 5. 配置环境变量

编辑服务器上的 `.env` 文件：

```bash
ssh <server> "vi /mnt/docker/apps/.env"
```

默认配置：
```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=rs_fullstack_db

# 前端端口（宿主机映射到 server:5678）
WEB_PORT=8080
```

### 6. 启动服务

```bash
ssh <server> "cd /mnt/docker/apps && docker compose up -d"
```

等待所有容器启动：
- `rs-fullstack-postgres` — PostgreSQL 数据库
- `rs-fullstack-server` — Rust 后端（内嵌前端）

### 7. 初始化数据库（首次部署）

首次部署时需同步数据库 schema：

```bash
ssh <server> "docker exec rs-fullstack-server npx prisma db push"
```

如需手动执行种子数据：

```bash
ssh <server> "docker exec rs-fullstack-server node dist/seed.js"
```

### 8. 验证部署

检查容器状态：
```bash
ssh <server> "cd /mnt/docker/apps && docker compose ps"
```

查看服务日志：
```bash
ssh <server> "cd /mnt/docker/apps && docker compose logs --tail=50 server"
```

## 服务访问地址

| 服务 | 默认端口 | 环境变量 | 说明 |
|------|---------|---------|------|
| 前端+后端 | 8080 | `WEB_PORT` | Rust 服务（内嵌前端） |
| 数据库 | 不暴露 | `DB_PORT` | 需启用 debug 叠加文件 |

> **注意**: 如端口被占用，修改 `.env` 文件中对应的端口变量即可。

## 默认账号

初始化后可使用以下账号登录：

| 邮箱 | 密码 | 角色 |
|------|------|------|
| admin@example.com | password | 超级管理员 |
| user@example.com | password | 普通用户 |

## 更新部署

当有代码更新时，重复以下步骤：

```bash
# 1. 本地重新构建镜像
make docker

# 2. 导出并上传
docker save rs-fullstack-server:latest -o rs-fullstack-docker-images.tar
scp rs-fullstack-docker-images.tar <server>:/path/to/tmp/

# 3. 服务器加载新镜像并重启
ssh <server> "docker load -i /path/to/tmp/rs-fullstack-docker-images.tar && \
  rm /path/to/tmp/rs-fullstack-docker-images.tar && \
  cd /mnt/docker/apps && \
  docker compose up -d"
```

## 重置数据库

如需完全重置数据库（**会删除所有数据**）：

```bash
ssh <server> "cd /mnt/docker/apps && \
  docker compose down && \
  rm -rf data && \
  docker compose up -d && \
  sleep 10 && \
  docker exec rs-fullstack-server npx prisma db push && \
  docker exec rs-fullstack-server node dist/seed.js"
```

## 常见问题

### 端口被占用

如果默认端口被占用，修改 `.env` 文件中的端口变量：

```env
# 前端+后端端口
WEB_PORT=8180
```

### 暴露数据库端口（可选）

默认仅暴露前端+后端端口到宿主机，数据库通过 Docker 内网通信（更安全）。

如需用数据库工具（DBeaver、pgAdmin）连接调试，在 `.env` 中添加：

```env
COMPOSE_FILE=docker-compose.yml:docker-compose.debug.yml
DB_PORT=5432
```

### 查看实时日志

```bash
ssh <server> "cd /mnt/docker/apps && docker compose logs -f"
```

### 进入容器调试

```bash
# 进入 server 容器
ssh <server> "docker exec -it rs-fullstack-server sh"

# 进入数据库容器
ssh <server> "docker exec -it rs-fullstack-postgres psql -U postgres -d rs_fullstack_db"
```
