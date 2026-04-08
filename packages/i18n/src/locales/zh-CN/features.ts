const features = {
  heading: "为什么选择这个模板",
  subheading: "生产级全栈架构，从数据库到部署的每一层都经过打磨，开箱即用",
  trpc: {
    title: "端到端类型安全",
    desc: "Rust DTO 通过 ts-rs 自动生成 TypeScript 类型，配合 Zod v4 校验，零运行时开销、全链路类型安全",
  },
  ssr: {
    title: "React 19 + React Router v7",
    desc: "最前沿的 React 技术栈，文件路由、客户端加载器、代码分割，配合 TanStack Query v5 管理服务端状态",
  },
  db: {
    title: "Sea-ORM + PostgreSQL 18",
    desc: "Rust 异步 ORM，类型安全查询与连接池，配合 Prisma 实现零停机 Schema 迁移",
  },
  backend: {
    title: "Rust (Axum) 后端",
    desc: "极速异步 Web 框架，编译为单二进制文件，jemalloc 加持，内存安全、零开销抽象",
  },
  tailwind: {
    title: "TailwindCSS 4 + 深色模式",
    desc: "原子化 CSS 配合 CSS 变量主题系统，明暗模式切换，自研组件库零第三方 UI 依赖",
  },
  devtools: {
    title: "严格开发工具链",
    desc: "Cargo 工作空间 + clippy pedantic 级 lint、rustfmt、Biome 前端检查、Turborepo 编排构建",
  },
  deploy: {
    title: "一键部署",
    desc: "多阶段 Docker 构建——Rust 二进制 + 内嵌 SPA 静态文件，SSH 一键推送到任何服务器",
  },
  multiplatform: {
    title: "Web + 小程序 + WASM",
    desc: "React SPA、微信小程序（Taro 4）、WebAssembly 模块——一个 Monorepo，三个平台",
  },
};

export default features;
