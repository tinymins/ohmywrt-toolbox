# Apps - Full Stack Application

一个基于 Monorepo 架构的全栈应用项目，使用 pnpm workspace 管理多个包。

## 📚 技术栈

### 前端 (packages/web)
- **框架**: React 19 + TypeScript
- **构建工具**: Vite 7
- **样式**: TailwindCSS 4
- **状态管理**: TanStack Query (React Query)
- **路由**: React Router DOM v7
- **API 通信**: tRPC Client
- **国际化**: i18next + react-i18next
- **动画**: Framer Motion

### 后端 (packages/server)
- **框架**: NestJS 11
- **API 类型**: tRPC (端到端类型安全)
- **数据库**: PostgreSQL 16
- **ORM**: Drizzle ORM
- **运行时**: Node.js with TypeScript
- **验证**: Zod

### 开发工具
- **包管理器**: pnpm 10.15.1
- **代码质量**: Biome (格式化 + Lint)
- **数据库容器**: Docker Compose
- **并发运行**: Concurrently

## 🚀 快速开始

### 前置要求

确保你的系统已安装以下工具：
- Node.js >= 18
- pnpm >= 10.15.1 (推荐使用 `corepack enable` 启用)
- Docker & Docker Compose (用于运行数据库)
- Git (用于清理忽略文件)

### 首次使用（一键初始化）

```bash
# 首次使用执行初始化（需要确认）
make init

# 然后启动开发环境
make dev
```

`make init` 是一个**破坏性操作**，执行前会要求确认，它会：
1. 检查并创建 `.env` 文件（如果不存在，从 `.env.example` 复制）
2. 停止并删除现有数据库容器
3. 删除现有数据库数据（`.data/postgres`）
4. 创建新的数据目录
5. 安装所有依赖
6. 启动数据库容器
7. 等待数据库就绪
8. 执行数据库迁移和种子数据

⚠️ **注意**：
- `make init` 会删除现有数据库数据，请谨慎使用！
- 如需清理 `node_modules`、`dist` 等文件，请手动执行 `git clean -fdX`

### 核心命令

```bash
make init    # 🔧 首次初始化（清理+安装+迁移+种子）
make dev     # 🚀 启动开发环境（数据库+开发服务器）
make build   # 🔨 编译生产版本
make docker  # 🐳 构建并启动 Docker 容器
```

### 开发服务器地址

运行 `make dev` 后：
- 后端: http://localhost:3000
- 前端: http://localhost:5173
- 数据库: localhost:5432

### 环境配置（可选）

如需自定义配置，在项目根目录创建 `.env` 文件：

```env
# 数据库配置
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=apps_db

# 数据库连接字符串
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/apps_db
```

## 🐳 Docker 部署

使用 Docker 一键部署：

```bash
# 构建镜像并启动所有服务
make docker
```

服务访问地址：
- 🌐 **前端应用**: http://localhost:8080
- 🔧 **后端 API**: http://localhost:4000
- 🔗 **tRPC 端点**: http://localhost:8080/trpc (通过 nginx 代理)
- 🗄️ **数据库**: localhost:5432

## 🛠️ 常用命令

```bash
# 代码格式化
pnpm format

# 代码检查
pnpm lint

# 类型检查
pnpm typecheck

# 编译生产版本
pnpm build

# 数据库相关（仅在开发时需要）
pnpm db:up       # 启动数据库
pnpm db:down     # 停止数据库
pnpm db:migrate  # 执行迁移
pnpm db:seed     # 注入种子数据
```

## 📁 项目结构

```
.
├── packages/
│   ├── server/          # NestJS 后端服务
│   │   ├── src/
│   │   │   ├── db/      # 数据库配置和 Schema
│   │   │   ├── trpc/    # tRPC 路由和配置
│   │   │   └── main.ts  # 应用入口
│   │   └── scripts/     # 生成脚本
│   └── web/             # React 前端应用
│       ├── src/
│       │   ├── components/  # React 组件
│       │   ├── hooks/       # 自定义 Hooks
│       │   └── lib/         # 工具库
│       └── vite.config.ts   # Vite 配置
├── docker-compose.yml   # Docker Compose 配置
├── Makefile            # Make 构建命令
├── pnpm-workspace.yaml # pnpm workspace 配置
└── package.json        # 根包配置
```

## 🔧 tRPC 集成

本项目使用 tRPC 实现前后端类型安全的 API 通信：

1. **后端定义路由** (`packages/server/src/trpc/routers/*.router.ts`)
2. **自动生成类型** (`pnpm gen:trpc`)
3. **前端类型安全调用** (`packages/web/src/lib/trpc.ts`)

示例：

```typescript
// 后端定义
export const helloRouter = router({
  greeting: publicProcedure
    .input(z.object({ name: z.string() }))
    .query(({ input }) => `Hello, ${input.name}!`),
});

// 前端调用 (完全类型安全)
const { data } = trpc.hello.greeting.useQuery({ name: 'World' });
```

## 🌍 国际化

前端支持多语言切换（中文/英文），配置文件位于 `packages/web/src/lib/i18n.ts`。

## 🎨 主题系统

支持明暗主题切换，使用 `useTheme` Hook 控制。

## 📝 注意事项

- 确保 PostgreSQL 数据库正在运行再启动后端服务
- 前端默认连接到 `http://localhost:3000/trpc` 的后端 API
- 开发模式下会自动重新加载代码变更
- 生产构建前确保运行 `pnpm build` 生成所有类型
- Docker 构建需要确保 `ts-morph` 依赖已添加到 `packages/server/package.json` 的 devDependencies 中
- 如果 Docker 构建失败，先尝试本地构建 `pnpm build` 来检查是否有类型错误

## 🤝 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

[MIT License](LICENSE)

## 🔗 相关链接

- [NestJS 文档](https://nestjs.com/)
- [React 文档](https://react.dev/)
- [tRPC 文档](https://trpc.io/)
- [Drizzle ORM 文档](https://orm.drizzle.team/)
- [Vite 文档](https://vitejs.dev/)
- [TailwindCSS 文档](https://tailwindcss.com/)
- tRPC: http://localhost:4000/trpc

## Demo Accounts

- admin@example.com / password
- user@example.com / password
