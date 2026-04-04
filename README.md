# rs-fullstack — Full-Stack Web Application

Rust + React 全栈 Monorepo 应用，使用 pnpm workspaces 管理。

## 技术栈

| Layer | Tech |
|-------|------|
| **Backend** | Rust (Axum) · Sea-ORM · PostgreSQL 18 |
| **Frontend** | React 19 · React Router v7 (SSR) · TailwindCSS 4 · TanStack Query v5 |
| **WASM** | wasm-bindgen · wasm-pack |
| **Types** | Zod v4 · TypeScript 5.9 · ts-rs |
| **Build** | Turborepo · Vite 7 |
| **Dev Tools** | Biome · Docker Compose · pnpm 10 |
| **Miniapp** | Taro 4 · React 18 · WeChat |

## 快速开始

```bash
# 首次初始化（创建 .env、安装依赖、启动 DB、迁移）
make init

# 启动开发环境
make dev
```

开发服务器：
- 前端: http://localhost:5173
- 后端 API: http://localhost:5678

## 核心命令

```bash
make init     # 首次初始化（破坏性操作，会重建数据库）
make dev      # 启动开发环境（DB + 开发服务器）
make build    # 生产构建
make docker   # Docker 构建
make lint     # Biome lint + typecheck
make gen:api  # 从 Rust 生成 TypeScript 类型
```

## 项目结构

```
packages/
  server/       Rust (Axum + Sea-ORM) 后端
  web/          React Router v7 SSR 前端
  wasm/         WebAssembly 模块
  types/        共享 Zod 模式 + TypeScript 类型
  components/   通用 UI 组件（TailwindCSS，无业务逻辑）
  i18n/         国际化资源（5种语言）
  miniapp/      微信小程序（Taro 4）
```

## 特色功能

- **端到端类型安全**: Rust DTO → ts-rs → TypeScript，全链路类型安全
- **SSR 支持**: React Router v7 服务端渲染，SEO 友好
- **多工作空间**: 支持多工作空间切换
- **管理后台**: 超级管理员/管理员/用户三级角色
- **对象存储**: OpenDAL 抽象（本地文件系统，可扩展 S3）
- **国际化**: 5种语言（zh-CN / en-US / de-DE / ja-JP / zh-TW）
- **主题系统**: 明暗主题 + CSS 变量 + 跟随系统

## 部署

参见 [DEPLOY.md](DEPLOY.md) 了解生产部署流程。

Docker Compose 包含 2 个服务：PostgreSQL、Rust 后端（内嵌前端静态文件）。

## 相关文档

- [Axum](https://github.com/tokio-rs/axum) · [Sea-ORM](https://www.sea-ql.org/SeaORM/)
- [React](https://react.dev/) · [React Router](https://reactrouter.com/) · [TailwindCSS](https://tailwindcss.com/)
- [Biome](https://biomejs.dev/) · [OpenDAL](https://opendal.apache.org/)

## License

[MIT](LICENSE)
