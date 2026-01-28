# Project Overview

This is a TypeScript monorepo managed with pnpm workspaces.
It consists of a full-stack application with a NestJS backend, React frontend, and shared type definitions.

## Project Structure

This monorepo contains a single full-stack application split into multiple packages:

- **packages/server**: NestJS backend with tRPC API layer
- **packages/web**: React frontend (Vite-based)
- **packages/types**: Shared TypeScript types and Zod schemas
- **packages/components**: 通用 UI 组件库（与业务无关的可复用组件）
- **packages/i18n**: 国际化资源包（多语言翻译资源）

## Tech Stack

### Backend (packages/server)
- **Framework**: NestJS 11
- **API Layer**: tRPC v11 for type-safe APIs with end-to-end type safety
- **Database**: PostgreSQL 16
- **ORM**: Drizzle ORM 0.45
- **Validation**: Zod v4 for runtime schema validation
- **Runtime**: Node.js with TypeScript

### Frontend (packages/web)
- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite 7
- **UI Library**: Ant Design 6 + TailwindCSS 4
- **State Management**: TanStack Query (React Query) v5
- **Routing**: React Router DOM v7
- **API Client**: tRPC Client (auto-generated from server types)
- **Internationalization**: i18next + react-i18next
- **Animation**: Framer Motion

### Shared (packages/types)
- **TypeScript** types and interfaces
- **Zod v4** schemas for validation and type inference
- Shared between server and client for end-to-end type safety

### Development Tools
- **Package Manager**: pnpm 10.15.1 (strict workspace protocol)
- **Code Quality**: Biome for linting & formatting (don't use Prettier/ESLint)
- **Database Container**: Docker Compose with PostgreSQL 16
- **Concurrent Tasks**: Concurrently for running multiple dev servers

## Files Structure

```
packages/
  server/          # Backend (NestJS + tRPC + Drizzle)
    src/
      db/          # Database client and schema definitions
        schema.ts  # Drizzle schema (PO - Persistent Objects)
        client.ts  # Database connection
      modules/     # Business modules (domain-driven)
        admin/     # Admin module
          admin.module.ts   # NestJS module registration
          admin.service.ts  # Business logic
          admin.router.ts   # tRPC router
          index.ts          # Module exports
        auth/      # Authentication module
          auth.module.ts
          auth.service.ts
          auth.router.ts
          index.ts
        user/      # User module
          user.module.ts
          user.service.ts
          user.router.ts
          index.ts
        workspace/  # Workspace module
          workspace.module.ts
          workspace.service.ts
          workspace.router.ts
          index.ts
        todo/      # Todo module
          todo.module.ts
          todo.service.ts
          todo.router.ts
          index.ts
        hello/     # Hello module (example)
          hello.module.ts
          hello.router.ts
          index.ts
        index.ts   # Registers all module routers for tRPC
      trpc/        # tRPC core configuration
        context.ts # Request context (auth, etc.)
        middlewares.ts
        decorators.ts  # @Router, @Query, @Mutation decorators
        router.builder.ts
        router.ts     # Main router entry
        trpc.module.ts # NestJS TrpcModule
        @generated/   # Auto-generated router types
    seed.ts        # Database seeding script
    drizzle.config.ts

  web/             # Frontend (React + Vite)
    src/
      components/  # 业务组件（依赖 API、包含业务逻辑）
        site/      # 官网页面组件
        dashboard/ # 控制台页面组件
        account/   # 用户账户组件
      pages/       # 页面组件（路由处理）
        dashboard/ # Dashboard pages
        login/     # Auth pages
      hooks/       # React custom hooks
      lib/         # Utilities and configurations
        trpc.ts    # tRPC client setup
        i18n.ts    # i18next configuration (uses @acme/i18n)
    index.html
    vite.config.ts

  components/      # 通用 UI 组件库
    src/
      index.ts     # Main exports
      Button/      # 通用按钮组件
      Modal/       # 通用弹窗组件
      ...          # 其他通用组件

  i18n/            # 国际化资源包
    src/
      index.ts     # Main exports
      locales/     # 语言资源
        zh.ts      # 中文翻译
        en.ts      # 英文翻译

  types/           # Shared types
    src/
      user.ts      # User types and schemas
      index.ts     # Main exports
```

## Build & Test

- **Install dependencies**: `pnpm install`
- **Start dev servers**: `pnpm dev` (runs server, web, and types concurrently)
  - Server: http://localhost:3000
  - Web: http://localhost:5173
- **Build for production**: `pnpm build`
- **Lint/Format**: `pnpm lint` or `pnpm format`
- **Type check**: `pnpm typecheck`
- **Database**:
  - Start: `pnpm db:up` (Docker Compose)
  - Stop: `pnpm db:down`
  - Migrate: `pnpm db:migrate`
  - Seed: `pnpm db:seed`

## Architecture Patterns

### Data Layer Separation

This project uses a clear separation between database entities and API contracts:

| Layer | Type | Purpose | Location |
|-------|------|---------|----------|
| **Database** | Drizzle Schema | Database table definitions | `packages/server/src/db/schema.ts` |
| **Types** | TypeScript + Zod | Shared type definitions and schemas | `packages/types/src/*.ts` |
| **Services** | Service Classes | Business logic layer | `packages/server/src/modules/[module]/[module].service.ts` |
| **API** | tRPC Routers | API endpoints with validation | `packages/server/src/modules/[module]/[module].router.ts` |

### Type & Schema Pattern

**All types and schemas are defined in `packages/types`:**

```typescript
// packages/types/src/user.ts
import { z } from "zod";

// Zod schemas for validation (single source of truth)
export const UserSettingsSchema = z.object({
  avatarUrl: z.string().nullable().optional(),
  langMode: z.enum(["auto", "zh", "en"]).optional(),
  themeMode: z.enum(["auto", "light", "dark"]).optional()
});

export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  role: z.enum(["admin", "user"]),
  settings: UserSettingsSchema.nullable().optional()
});

// Inferred TypeScript types
export type UserSettings = z.infer<typeof UserSettingsSchema>;
export type User = z.infer<typeof UserSchema>;
```

**Key Principles:**
1. **Zod schemas are the single source of truth** - types are inferred via `z.infer<>`
2. **Runtime + Compile-time safety** - Zod validates at runtime, TypeScript checks at compile-time
3. **Shared between server and client** - ensures end-to-end type safety

### tRPC Router Pattern

**Use NestJS decorators for clean router definitions with service layer:**

```typescript
// packages/server/src/modules/user/user.service.ts
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { db } from "../../db/client";
import { users } from "../../db/schema";
import type { UserSettings } from "@acme/types";

// Transform database entity to API output
export const toUserOutput = (user: typeof users.$inferSelect) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role as "admin" | "user",
  settings: (user.settings as UserSettings | null) ?? null
});

export class UserService {
  async getById(userId: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return user ?? null;
  }

  async updateProfile(userId: string, updates: { name?: string; email?: string }) {
    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning();

    if (!updated) {
      throw new TRPCError({ code: "NOT_FOUND", message: "用户不存在" });
    }
    return updated;
  }
}

export const userService = new UserService();
```

```typescript
// packages/server/src/modules/user/user.router.ts
import { z } from "zod";
import { UserSchema, UserSettingsPatchSchema } from "@acme/types";
import { Router, Query, Mutation, Ctx, UseMiddlewares } from "../../trpc/decorators";
import { requireUser } from "../../trpc/middlewares";
import type { Context } from "../../trpc/context";
import { userService, toUserOutput } from "./user.service";

const userUpdateInput = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  settings: UserSettingsPatchSchema.nullable().optional()
});

@Router({ alias: "user" })
export class UserRouter {
  @Query({ output: UserSchema })
  @UseMiddlewares(requireUser)
  async getProfile(@Ctx() ctx: Context) {
    const user = await userService.getById(ctx.userId!);
    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "用户不存在" });
    }
    return toUserOutput(user);
  }

  @Mutation({ input: userUpdateInput, output: UserSchema })
  @UseMiddlewares(requireUser)
  async updateProfile(input: z.infer<typeof userUpdateInput>, @Ctx() ctx: Context) {
    const updated = await userService.updateProfile(ctx.userId!, input);
    return toUserOutput(updated);
  }
}
```

**Router Best Practices:**
1. **Always define input/output schemas** using Zod
2. **Use `@UseMiddlewares(requireUser)`** for protected routes
3. **Transform database entities** before returning via `toUserOutput()` helpers
4. **Never expose database entities directly** - always transform to clean API types
5. **Use TypeScript type inference** - let TypeScript infer types from Zod schemas
6. **Throw `TRPCError`** for error handling with proper error codes

## Coding Guidelines

### General TypeScript Rules

- Always prefer **async/await** over `.then()` for asynchronous operations
- Use **arrow functions** for consistency (`const fn = () => {}`)
- Avoid `any`; prefer `unknown` with proper type narrowing
- **Zod v4** schemas are mandatory for all runtime validation and API contracts
- Follow **TSDoc style** for documenting public APIs and complex logic
- **Import order**: Node built-ins → external packages → internal modules → relative imports

### React Guidelines

- Use **functional components + hooks only** (no class components)
- Type props with `interface Props {}` instead of `type`
- Use `React.FC<Props>` sparingly; prefer explicit function typing: `function Component(props: Props) {}`
- Keep components small and focused on a single responsibility
- Use TanStack Query for all tRPC calls in components
- Prefer controlled components over uncontrolled

### Component Architecture (通用组件 vs 业务组件)

**组件分类原则：**

| 类型 | 位置 | 特征 | 示例 |
|------|------|------|------|
| **通用组件** | `packages/components` | 与业务逻辑无关，可跨项目复用 | Button, Modal, Card, Loading, Empty |
| **业务组件** | `packages/web/src/components` | 依赖 API/tRPC，包含业务逻辑 | UserMenu, WorkspaceList, TodoItem |

**通用组件 (`@acme/components`) 放置标准：**
- ✅ 纯 UI 展示组件（Button, Badge, Tag, Avatar）
- ✅ 布局组件（Container, Grid, Stack, Divider）
- ✅ 表单基础组件（FormField, InputWrapper）
- ✅ 反馈组件（Loading, Empty, ErrorBoundary）
- ✅ 对 Ant Design 组件的二次封装
- ❌ 不依赖 tRPC 或具体 API
- ❌ 不包含业务逻辑或业务状态

**业务组件 (`packages/web/src/components`) 放置标准：**
- ✅ 依赖 tRPC hooks 获取数据
- ✅ 包含业务逻辑和业务状态
- ✅ 与特定页面或功能紧密相关
- ✅ 使用 i18n 翻译键

**使用方式：**

```typescript
// 从通用组件库导入
import { Button, Loading, Empty } from "@acme/components";

// 业务组件直接相对路径导入
import { UserMenu } from "@/components/account";
import { WorkspaceList } from "@/components/dashboard";
```

### File Size Guidelines (文件大小规范)

**单一文件不应超过 500 行代码**。如果文件超过此限制，应进行拆分：

- **组件拆分**：将大组件拆分为多个子组件
- **逻辑拆分**：将复杂逻辑抽取到自定义 hooks
- **类型拆分**：将类型定义移至独立文件
- **常量拆分**：将配置和常量移至独立文件

```typescript
// ❌ 不要：单个 500+ 行的组件
// BigComponent.tsx (600 lines)

// ✅ 应该：拆分为多个文件
// BigComponent/
//   index.tsx        # 主组件 (~100 lines)
//   SubComponentA.tsx # 子组件 (~150 lines)
//   SubComponentB.tsx # 子组件 (~150 lines)
//   useBigComponent.ts # 自定义 hook (~100 lines)
//   types.ts          # 类型定义 (~50 lines)
//   constants.ts      # 常量配置 (~50 lines)
```

### Database & ORM (Drizzle)

- **Schema definitions** live in `packages/server/src/db/schema.ts`
- Use **Drizzle ORM** methods for all database queries
- Never expose database entities directly through API boundaries
- Use `$inferSelect` and `$inferInsert` for type inference from schema
- Always use prepared statements (Drizzle does this by default)

### tRPC Best Practices

- **Input validation**: All procedures must define `.input()` with Zod schema
- **Output validation**: Define `.output()` schema for all queries/mutations
- **Middleware**: Use `@UseMiddlewares(requireUser)` for protected routes
- **Error handling**: Throw `TRPCError` with appropriate error codes
- **Context**: Access auth context via `@Ctx()` decorator
- **Auto-generation**: Router types are auto-generated in `packages/server/src/trpc/@generated/`

### Naming Conventions

| Entity | Schema File | Type Export | Variable Name | Router Class |
|--------|-------------|-------------|---------------|--------------|
| User | `user.ts` | `User`, `UserSettings` | `user`, `users` | `UserRouter` |
| Todo | `todo.ts` | `Todo`, `CreateTodoInput` | `todo`, `todos` | `TodoRouter` |
| Workspace | `workspace.ts` | `Workspace` | `workspace`, `workspaces` | `WorkspaceRouter` |

### Form & Component Patterns

**Accept props as objects, not individual primitives:**

```typescript
// ✅ Good: Single object prop
interface Props {
  user: User;
  onUserChange: (user: User) => void;
}

// ❌ Bad: Multiple individual props
interface Props {
  userName: string;
  userEmail: string;
  onNameChange: (name: string) => void;
  onEmailChange: (email: string) => void;
}
```

**Implementation pattern:**
- Form component: `value: User`, `onChange: (value: User) => void`
- Parent component: `const [user, setUser] = useState<User>(...)`
- Helper function: `updateField<K extends keyof User>(field: K, value: User[K])`

## Adding a New Feature

### 1. Define Types & Schemas

**In `packages/types/src/[feature].ts`:**

```typescript
import { z } from "zod";

// Define Zod schemas (single source of truth)
export const TodoSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  title: z.string(),
  category: z.string(),
  completed: z.boolean(),
  createdAt: z.string() // ISO 8601 string
});

export const CreateTodoInputSchema = z.object({
  workspaceId: z.string(),
  title: z.string().min(1),
  category: z.string().default("默认")
});

export const UpdateTodoInputSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  category: z.string().optional(),
  completed: z.boolean().optional()
});

// Infer types from schemas
export type Todo = z.infer<typeof TodoSchema>;
export type CreateTodoInput = z.infer<typeof CreateTodoInputSchema>;
export type UpdateTodoInput = z.infer<typeof UpdateTodoInputSchema>;
```

### 2. Create Database Schema

**In `packages/server/src/db/schema.ts`:**

```typescript
export const todos = pgTable("todos", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id).notNull(),
  title: text("title").notNull(),
  category: text("category").notNull().default("默认"),
  completed: boolean("completed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});
```

### 3. Create Module with Service and Router

**In `packages/server/src/modules/[feature]/[feature].service.ts`:**

```typescript
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { db } from "../../db/client";
import { todos } from "../../db/schema";

export class TodoService {
  async listByWorkspace(workspaceId: string) {
    return db
      .select()
      .from(todos)
      .where(eq(todos.workspaceId, workspaceId));
  }

  async create(input: { title: string; category?: string }, workspaceId: string) {
    const [created] = await db
      .insert(todos)
      .values({
        workspaceId,
        title: input.title,
        category: input.category ?? "默认"
      })
      .returning();

    return created;
  }
}

export const todoService = new TodoService();
```

**In `packages/server/src/modules/[feature]/[feature].router.ts`:**

```typescript
import { z } from "zod";
import { TodoSchema, CreateTodoInputSchema } from "@acme/types";
import { Router, Query, Mutation, Ctx, UseMiddlewares } from "../../trpc/decorators";
import { requireUser } from "../../trpc/middlewares";
import { todoService } from "./todo.service";

// Transform database entity to API type
const toTodoOutput = (dbTodo: typeof todos.$inferSelect) => ({
  id: dbTodo.id,
  workspaceId: dbTodo.workspaceId,
  title: dbTodo.title,
  category: dbTodo.category,
  completed: dbTodo.completed,
  createdAt: dbTodo.createdAt.toISOString()
});

@Router({ alias: "todo" })
export class TodoRouter {
  @Query({
    input: z.object({ workspaceId: z.string() }),
    output: z.array(TodoSchema)
  })
  @UseMiddlewares(requireUser)
  async list(input: { workspaceId: string }) {
    const result = await todoService.listByWorkspace(input.workspaceId);
    return result.map(toTodoOutput);
  }

  @Mutation({ input: CreateTodoInputSchema, output: TodoSchema })
  @UseMiddlewares(requireUser)
  async create(input: z.infer<typeof CreateTodoInputSchema>, @Ctx() ctx: Context) {
    const created = await todoService.create(input, input.workspaceId);
    return toTodoOutput(created);
  }
}
```

**In `packages/server/src/modules/[feature]/[feature].module.ts`:**

```typescript
import { Module } from "@nestjs/common";
import { TodoRouter } from "./todo.router";
import { TodoService } from "./todo.service";

@Module({
  providers: [TodoService, TodoRouter],
  exports: [TodoService, TodoRouter]
})
export class TodoModule {}
```

**In `packages/server/src/modules/[feature]/index.ts`:**

```typescript
export * from "./todo.module";
export * from "./todo.service";
export * from "./todo.router";
```

### 4. Register Module

**In `packages/server/src/modules/index.ts`:**

```typescript
import "./todo"; // Add this line to register the router for tRPC type generation
```

**In `packages/server/src/app.module.ts`:**

```typescript
import { TodoModule } from "./modules/todo";

@Module({
  imports: [
    TrpcModule.forRoot({ createContext }),
    // ... other modules
    TodoModule  // Add this line to register with NestJS
  ],
  controllers: [AppController]
})
export class AppModule {}
```

### 5. Use in Frontend

**In React components:**

```typescript
import { trpc } from "@/lib/trpc";
import type { Todo } from "@acme/types";

function TodoList({ workspaceId }: { workspaceId: string }) {
  const { data: todos, isLoading } = trpc.todo.list.useQuery({ workspaceId });
  const createMutation = trpc.todo.create.useMutation();

  const handleCreate = async (title: string) => {
    await createMutation.mutateAsync({
      workspaceId,
      title,
      category: "默认"
    });
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {todos?.map(todo => (
        <div key={todo.id}>{todo.title}</div>
      ))}
    </div>
  );
}
```

### Checklist

Before committing a new feature:

- ✅ Types and schemas defined in `packages/types`
- ✅ Database schema added to `packages/server/src/db/schema.ts`
- ✅ NestJS module created in `packages/server/src/modules/[feature]/[feature].module.ts`
- ✅ Service class created in `packages/server/src/modules/[feature]/[feature].service.ts`
- ✅ tRPC router implemented in `packages/server/src/modules/[feature]/[feature].router.ts`
- ✅ Module index exports module, service and router
- ✅ Module imported in `packages/server/src/modules/index.ts` (for tRPC types)
- ✅ Module registered in `packages/server/src/app.module.ts` (for NestJS DI)
- ✅ Input/output schemas defined for all procedures
- ✅ `toXxxOutput()` helper function for DB → API transformation
- ✅ Middleware applied for protected routes
- ✅ Frontend components use tRPC hooks
- ✅ Run `pnpm db:migrate` to push schema changes
- ✅ Test the feature end-to-end
