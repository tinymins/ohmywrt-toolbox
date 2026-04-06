# 服务器部署指南

## 一键部署

```bash
make deploy
```

自动完成：构建镜像 → 导出 → 上传 → 部署 → 启动。

部署脚本配置见 `scripts/.env`（首次使用需从 `scripts/.env.example` 复制并修改）。

更多选项：

```bash
make deploy         # 完整部署（构建+上传+部署）
./scripts/deploy.sh -b    # 仅构建镜像
./scripts/deploy.sh -m    # 仅执行数据库迁移
./scripts/deploy.sh -r    # 仅重启服务
./scripts/deploy.sh -l    # 查看服务日志
./scripts/deploy.sh -e    # 检查服务器 .env 配置
./scripts/deploy.sh -h    # 查看所有选项
```

## 架构概览

生产环境仅包含 **2 个容器**：

| 容器 | 镜像 | 说明 |
|------|------|------|
| `ohmywrt-toolbox-postgres` | `postgres:18` | PostgreSQL 数据库 |
| `ohmywrt-toolbox-server` | `ohmywrt-toolbox-server:latest` | Rust 后端 + 内嵌前端静态文件 |

Server 二进制为 `ohmywrt-toolbox-server`，监听端口 **5678**，通过 Docker 映射到宿主机 `WEB_PORT`（默认 8080）。

### 容器启动流程

容器通过 `docker-entrypoint.sh` 启动，执行以下步骤：

1. **下载 vendor 二进制**：调用 `scripts/download-vendors.sh` 下载配置校验用的 sing-box/mihomo（已存在则跳过）
2. **启动 Rust 服务器**：`ohmywrt-toolbox-server`

> Volume mount 会覆盖构建时的 `/app/data` 目录，因此 vendor 二进制需在容器启动时重新下载到持久化卷中。

### 安全：配置校验沙箱

配置校验使用 `unshare --user --net` 在隔离的网络命名空间中执行第三方二进制（sing-box），防止 RCE 攻击。

Docker 默认 seccomp profile 禁止 `unshare` syscall。解决方案：

- `docker/seccomp.json`：自定义 seccomp profile，在 Docker 默认基础上**仅额外放行 `unshare` 一个 syscall**
- `docker-compose.yml` 中通过 `security_opt: - seccomp=seccomp.json` 引用
- `unshare --user --net` 通过用户命名空间获得 CAP_SYS_ADMIN，不需要给容器添加任何额外 capability

## 前置要求

### 本地环境
- Node.js >= 20.19 或 >= 22.12
- pnpm >= 10.15.1
- Rust toolchain（见 `rust-toolchain.toml`）
- Docker

### 服务器环境
- Docker & Docker Compose
- SSH 访问权限

## 首次部署

首次部署需要额外配置：

### 1. 配置部署脚本

```bash
cp scripts/.env.example scripts/.env
# 编辑 scripts/.env，设置服务器地址等
```

### 2. 配置生产环境

```bash
cp docker/.env.example docker/.env
# 编辑 docker/.env，设置数据库密码等
```

### 3. 执行部署

```bash
make deploy
```

### 4. 初始化数据库（仅首次）

```bash
./scripts/deploy.sh -m
```

## 服务访问地址

| 服务 | 默认端口 | 环境变量 | 说明 |
|------|---------|---------|------|
| 前端+后端 | 8080 | `WEB_PORT` | Rust 服务（内嵌前端） |
| 数据库 | 不暴露 | `DB_PORT` | 需启用 debug 叠加文件 |

## 常见问题

### 端口被占用

修改 `docker/.env` 中的 `WEB_PORT`：

```env
WEB_PORT=8180
```

### 暴露数据库端口（可选）

默认仅暴露前端+后端端口，数据库通过 Docker 内网通信。如需用 DBeaver 等工具连接调试：

```env
COMPOSE_FILE=docker-compose.yml:docker-compose.debug.yml
DB_PORT=5432
```

### 查看日志 / 进入容器

```bash
./scripts/deploy.sh -l                              # 查看日志
ssh <server> "docker exec -it ohmywrt-toolbox-server sh"   # 进入容器
```
