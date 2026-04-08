# rs-fullstack — 全栈 Rust + React 开发模板

开箱即用的全栈开发模板：Rust (Axum) 后端 + React 19 SPA 前端，pnpm monorepo 管理。内置认证系统、多工作空间、国际化（5 种语言）、深色模式、WASM 模块和一键 Docker 部署。

[English](README.md)

## 技术栈

| 层级 | 技术 |
|------|------|
| **后端** | Rust (Axum) · Sea-ORM · PostgreSQL 18 |
| **前端** | React 19 · React Router v7 · TailwindCSS 4 · TanStack Query v5 |
| **WASM** | wasm-bindgen · wasm-pack |
| **类型** | Zod v4 · TypeScript 5.9 · ts-rs |
| **构建** | Turborepo · Vite 7 |
| **工具** | Cargo clippy · rustfmt · Biome · Docker Compose · pnpm 10 |
| **小程序** | Taro 4 · React 18 · 微信 |

## 快速开始

```bash
# 首次初始化（创建 .env、安装依赖、启动数据库、执行迁移）
make init

# 启动开发环境
make dev
```

开发服务器：
- 前端：http://localhost:5173
- 后端 API：http://localhost:5678

## 核心命令

```bash
make init      # 首次初始化（创建 .env、安装依赖、启动数据库、同步 schema）
make dev       # 启动开发环境（数据库 + 开发服务器）
make build     # 生产构建
make docker    # Docker 镜像构建
make deploy    # 一键部署到服务器
make lint      # Biome + Cargo clippy + 类型检查
make gen:api   # 从 Rust DTO 生成 TypeScript 类型
```

## 项目结构

```
packages/
  server/       Rust (Axum + Sea-ORM) 后端
  web/          React Router v7 SPA 前端
  wasm/         WebAssembly 模块
  types/        共享 Zod schemas + TypeScript 类型
  components/   通用 UI 组件（TailwindCSS，无业务逻辑）
  i18n/         国际化资源（5 种语言）
  miniapp/      微信小程序（Taro 4）
```

## 特色功能

- **端到端类型安全**：Rust DTO → ts-rs → TypeScript，搭配 Zod v4 验证，全链路类型安全
- **SPA + 客户端路由**：React Router v7 代码分割 + 客户端加载器
- **多工作空间**：支持工作空间切换，基于角色的访问控制
- **管理后台**：超级管理员 / 管理员 / 用户三级角色
- **对象存储**：OpenDAL 抽象（本地文件系统，可扩展至 S3）
- **国际化**：5 种语言（zh-CN / en-US / de-DE / ja-JP / zh-TW）
- **主题系统**：明暗模式 + CSS 变量 + 跟随系统偏好
- **严格开发工具链**：Cargo workspace + clippy pedantic 静态分析、rustfmt、Biome、Turborepo
- **一键部署**：多阶段 Docker 构建 + 嵌入式 SPA，SSH 一键部署到服务器
- **多平台**：React SPA + 微信小程序（Taro 4）+ WASM 模块，一个 Monorepo 三大平台

## 部署

参见 [DEPLOY.md](DEPLOY.md) 了解生产部署流程。

Docker Compose 包含 2 个服务：PostgreSQL 数据库、Rust 后端（内嵌前端静态文件）。

## 相关文档

- [Axum](https://github.com/tokio-rs/axum) · [Sea-ORM](https://www.sea-ql.org/SeaORM/)
- [React](https://react.dev/) · [React Router](https://reactrouter.com/) · [TailwindCSS](https://tailwindcss.com/)
- [Biome](https://biomejs.dev/) · [OpenDAL](https://opendal.apache.org/)

## 许可证

[MIT](LICENSE)
