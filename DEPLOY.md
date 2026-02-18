# 服务器部署指南

本文档描述如何从零开始将 ohmywrt-toolbox 部署到服务器。

## 前置要求

### 本地环境
- Node.js >= 20.19 或 >= 22.12
- pnpm >= 10.15.1
- Docker

### 服务器环境
- Docker & Docker Compose
- SSH 访问权限

## 部署步骤

### 1. 本地构建 Docker 镜像

```bash
cd /path/to/ohmywrt-toolbox

# 构建 server 和 web 镜像
make docker
```

构建完成后会生成两个镜像：
- `ohmywrt-toolbox-server:latest`
- `ohmywrt-toolbox-web:latest`

### 2. 导出并上传镜像

```bash
# 导出镜像为 tar 文件
docker save ohmywrt-toolbox-server:latest ohmywrt-toolbox-web:latest \
  -o /tmp/ohmywrt-toolbox-docker-images.tar

# 上传到服务器
scp /tmp/ohmywrt-toolbox-docker-images.tar <server>:/tmp/
```

### 3. 服务器端准备

SSH 登录服务器后执行：

```bash
# 创建部署目录
mkdir -p /mnt/docker/ohmywrt-toolbox

# 加载 Docker 镜像
docker load -i /tmp/ohmywrt-toolbox-docker-images.tar

# 清理临时文件
rm /tmp/ohmywrt-toolbox-docker-images.tar
```

### 4. 上传配置文件

从本地上传配置文件：

```bash
# 上传 docker-compose.yml
scp docker-compose.yml <server>:/mnt/docker/ohmywrt-toolbox/

# 上传环境变量文件（使用 .env.example 作为模板）
scp .env.example <server>:/mnt/docker/ohmywrt-toolbox/.env
```

### 5. 配置环境变量（可选）

如需自定义数据库配置，编辑服务器上的 `.env` 文件：

```bash
ssh <server> "vi /mnt/docker/ohmywrt-toolbox/.env"
```

默认配置：
```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=ohmywrt_toolbox_db

# 前端端口
WEB_PORT=8080

# 暴露后端/数据库端口到宿主机（可选，取消注释启用）
# COMPOSE_FILE=docker-compose.yml:docker-compose.debug.yml
# SERVER_PORT=4000
# DB_PORT=5432
```

### 6. 启动服务

```bash
ssh <server> "cd /mnt/docker/ohmywrt-toolbox && docker compose up -d"
```

等待所有容器启动：
- `ohmywrt-toolbox-postgres` - PostgreSQL 数据库
- `ohmywrt-toolbox-server` - NestJS 后端
- `ohmywrt-toolbox-web` - Nginx + React 前端

### 7. 初始化数据库

首次部署需要执行数据库迁移和种子数据：

```bash
# 执行数据库迁移（创建表结构）
ssh <server> "docker exec ohmywrt-toolbox-server npx drizzle-kit push"

# 执行种子数据（创建默认用户和工作空间）
ssh <server> "docker exec ohmywrt-toolbox-server npx tsx src/seed.ts"
```

### 8. 验证部署

检查容器状态：
```bash
ssh <server> "cd /mnt/docker/ohmywrt-toolbox && docker compose ps"
```

查看服务日志：
```bash
ssh <server> "cd /mnt/docker/ohmywrt-toolbox && docker compose logs --tail=50 server"
```

## 服务访问地址

| 服务 | 默认端口 | 环境变量 | 说明 |
|------|---------|---------|------|
| 前端 | 8080 | `WEB_PORT` | React 应用 (通过 Nginx) |
| 后端 | 不暴露 | `SERVER_PORT` | 需启用 debug 叠加文件（见下方说明） |
| 数据库 | 不暴露 | `DB_PORT` | 需启用 debug 叠加文件（见下方说明） |
| tRPC | ${WEB_PORT}/trpc | - | API 端点 (通过 Nginx 代理) |

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
docker save ohmywrt-toolbox-server:latest ohmywrt-toolbox-web:latest \
  -o /tmp/ohmywrt-toolbox-docker-images.tar
scp /tmp/ohmywrt-toolbox-docker-images.tar <server>:/tmp/

# 3. 服务器加载新镜像并重启
ssh <server> "docker load -i /tmp/ohmywrt-toolbox-docker-images.tar && \
  rm /tmp/ohmywrt-toolbox-docker-images.tar && \
  cd /mnt/docker/ohmywrt-toolbox && \
  docker compose up -d"

# 4. 如有数据库变更，执行迁移
ssh <server> "docker exec ohmywrt-toolbox-server npx drizzle-kit push"
```

## 重置数据库

如需完全重置数据库（**会删除所有数据**）：

```bash
ssh <server> "cd /mnt/docker/ohmywrt-toolbox && \
  docker compose down && \
  rm -rf .data && \
  docker compose up -d && \
  sleep 10 && \
  docker exec ohmywrt-toolbox-server npx drizzle-kit push && \
  docker exec ohmywrt-toolbox-server npx tsx src/seed.ts"
```

## 常见问题

### 端口被占用

如果前端默认端口被占用，修改 `.env` 文件中的端口变量：

```env
# 前端端口
WEB_PORT=8180
```

### 暴露后端/数据库端口（可选）

默认仅前端暴露端口到宿主机，后端和数据库通过 Docker 内网通信（更安全）。
前端 Nginx 自动代理 `/trpc` 请求到后端，无需额外暴露。

如需直接访问后端 API 或用数据库工具（DBeaver、pgAdmin）连接调试，在 `.env` 中添加：

```env
COMPOSE_FILE=docker-compose.yml:docker-compose.debug.yml
SERVER_PORT=4000
DB_PORT=5432
```

> 可以只暴露其中一个，不需要的端口变量不设置即可（叠加文件中有默认值）。

### 查看实时日志

```bash
ssh <server> "cd /mnt/docker/ohmywrt-toolbox && docker compose logs -f"
```

### 进入容器调试

```bash
# 进入 server 容器
ssh <server> "docker exec -it ohmywrt-toolbox-server sh"

# 进入数据库容器
ssh <server> "docker exec -it ohmywrt-toolbox-postgres psql -U postgres -d ohmywrt_toolbox_db"
```
