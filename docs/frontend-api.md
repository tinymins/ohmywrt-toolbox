# Frontend REST API Pattern

前端通过 `rust-api-runtime.ts` 提供的工厂函数调用 Rust 后端 REST API，使用 TanStack Query v5 管理服务端状态。

## 概述

```
前端组件
  └── userApi.getProfile.useQuery()        ← hooks（generated/rust-api/）
        └── createQuery<void, User>(...)    ← 工厂（rust-api-runtime.ts）
              └── callApi<T>(url, init?)    ← fetch 封装
                    └── fetch(rustUrl(path))← URL 解析（server-base.ts）
```

## rust-api-runtime.ts

### 工厂函数

| 函数 | 用途 | HTTP 方法 |
|------|------|----------|
| `createQuery<TInput, TOutput>` | 只读查询（GET） | GET（默认） |
| `createMutation<TInput, TOutput>` | 写入操作 | POST（默认）/ PATCH / DELETE / PUT |
| `createPathMutation<TInput, TOutput>` | 动态路径写入 | POST / PATCH / DELETE |
| `createStreamMutation<TInput, TChunk>` | SSE 流式请求 | POST |

### createQuery

```typescript
import { createQuery } from "@/lib/rust-api-runtime";
import type { User } from "@/generated/rust-types/User";

// 无参数查询
const getProfile = createQuery<void, User>({ path: "/api/user/profile" });

// 带参数查询（自动拼接为 query string）
const listUsers = createQuery<{ page: number }, User[]>({ path: "/api/admin/users" });

// 动态路径 + 自定义参数
const browseFiles = createQuery<{ id: string; path: string }, FileItem[]>({
  path: "/api/file-systems",
  pathFn: (input) => `/api/file-systems/${input.id}/browse`,
  paramsFn: (input) => ({ path: input.path }),
});
```

返回对象：

| 方法 | 说明 |
|------|------|
| `.useQuery(input?, opts?)` | React Query `useQuery` hook |
| `.fetch(input?)` | 非 hook 的原始 fetch（用于 event handler / loader） |
| `.queryKey(input?)` | 获取 query key（用于 invalidation） |
| `.invalidate(qc, input?)` | 使查询失效（在 mutation onSuccess 中使用） |
| `.setData(qc, input, updater)` | 直接更新查询缓存 |

### createMutation

```typescript
import { createMutation } from "@/lib/rust-api-runtime";
import type { UserUpdateInput, User } from "@/generated/rust-types/User";

const updateProfile = createMutation<UserUpdateInput, User>({
  method: "PATCH",
  path: "/api/user/profile",
});

// 动态路径 + body 提取
const updateItem = createMutation<{ id: string; title: string }, Item>({
  method: "PATCH",
  path: "/api/items",
  pathFn: (input) => `/api/items/${input.id}`,
  bodyFn: (input) => ({ title: input.title }),
});
```

返回对象：

| 方法 | 说明 |
|------|------|
| `.useMutation(opts?)` | React Query `useMutation` hook |
| `.mutate(input)` | 非 hook 的原始 fetch |

### createPathMutation

专用于路径中包含动态段的 mutation（如 DELETE by ID）：

```typescript
import { createPathMutation } from "@/lib/rust-api-runtime";

const revokeSession = createPathMutation<string, void>({
  method: "DELETE",
  pathFn: (id) => `/api/user/sessions/${encodeURIComponent(id)}`,
});

// 组件中使用
const mutation = revokeSession.useMutation();
mutation.mutate(sessionId);
```

### createStreamMutation

用于 SSE 流式响应（如搜索、AI 生成）：

```typescript
import { createStreamMutation } from "@/lib/rust-api-runtime";

const searchStream = createStreamMutation<SearchRequest, ResultChunk[]>({
  path: "/api/search",
});

// 使用
await searchStream.stream(
  { query: "hello" },
  (chunk) => console.log("received:", chunk),
  abortController.signal
);
```

## 添加新的 API Hook

### 1. 确保 Rust 端已定义路由和 DTO

```rust
// Rust handler
pub async fn list_todos(...) -> Result<Json<ApiResponse<Vec<TodoOutput>>>, AppError> { ... }

// Rust DTO（带 ts-rs 导出）
#[derive(Serialize, TS)]
#[ts(export)]
pub struct TodoOutput {
    pub id: String,
    pub title: String,
    pub completed: bool,
}
```

### 2. 运行类型生成

```bash
make gen:api
```

### 3. 创建 API hook 文件

```typescript
// packages/web/src/generated/rust-api/todo.ts
import { createQuery, createMutation } from "@/lib/rust-api-runtime";
import type { TodoOutput } from "@/generated/rust-types/TodoOutput";

interface CreateTodoInput {
  title: string;
  workspaceId: string;
}

export const todoApi = {
  list: createQuery<{ workspaceId: string }, TodoOutput[]>({
    path: "/api/todos",
    paramsFn: (input) => ({ workspaceId: input.workspaceId }),
  }),
  create: createMutation<CreateTodoInput, TodoOutput>({
    path: "/api/todos",
  }),
  toggle: createMutation<{ id: string; completed: boolean }, TodoOutput>({
    method: "PATCH",
    pathFn: (input) => `/api/todos/${encodeURIComponent(input.id)}`,
    bodyFn: (input) => ({ completed: input.completed }),
  }),
  delete: createPathMutation<string, void>({
    method: "DELETE",
    pathFn: (id) => `/api/todos/${encodeURIComponent(id)}`,
  }),
};
```

### 4. 在 index.ts 中导出

```typescript
// packages/web/src/generated/rust-api/index.ts
export { todoApi } from "./todo";
```

### 5. 在组件中使用

```typescript
import { todoApi } from "@/generated/rust-api";

function TodoList({ workspaceId }: { workspaceId: string }) {
  const { data: todos, isLoading } = todoApi.list.useQuery({ workspaceId });
  const createMutation = todoApi.create.useMutation({
    onSuccess: () => {
      const qc = useQueryClient();
      todoApi.list.invalidate(qc, { workspaceId });
    },
  });

  if (isLoading) return <Spinner />;

  return (
    <div>
      {todos?.map((todo) => (
        <div key={todo.id}>{todo.title}</div>
      ))}
    </div>
  );
}
```

## 错误处理

### RustApiError

```typescript
class RustApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "RustApiError";
  }
}
```

所有 API 调用错误统一为 `RustApiError`，包含 HTTP 状态码和错误消息。

### 自动错误展示

`createMutation` 和 `createPathMutation` 内置自动错误处理：

1. 如果传入了 `onError` 回调 → 调用自定义处理
2. 否则 → 通过 `ErrorDisplayContext` 显示全局错误提示

```typescript
// 自定义错误处理
const mutation = userApi.updateProfile.useMutation({
  onError: (error) => {
    if (error.status === 409) {
      // 处理冲突
    }
  },
});

// 默认行为：自动弹出错误提示
const mutation = userApi.updateProfile.useMutation();
```

### ErrorDisplayContext

```typescript
// lib/error-display.ts
export interface ErrorDisplay {
  error: (message: string) => void;
  success: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

export const ErrorDisplayContext = createContext<ErrorDisplay | null>(null);
```

在 `root.tsx` 中通过 Provider 注入具体的 toast/notification 实现。

## Vite 代理配置

```typescript
// packages/web/vite.config.ts
server: {
  host: "0.0.0.0",
  port: webPort,  // 默认 5173
  proxy: {
    "/api": {
      target: `http://localhost:${serverPort}`,  // 默认 4000
      changeOrigin: true,
    },
    "/upload": {
      target: `http://localhost:${serverPort}`,
      changeOrigin: true,
    },
    "/storage": {
      target: `http://localhost:${serverPort}`,
      changeOrigin: true,
    },
  },
}
```

`SERVER_PORT` 环境变量（默认 4000）控制代理目标端口。也可通过 `packages/web/.env` 中的 `RUST_SERVER` 变量直接指定后端 URL。

### 语言头

所有 API 请求自动携带 `x-lang` header，值从 `document.documentElement.lang` 读取（由 i18next 设置），用于后端返回本地化错误消息。

## 类型生成流水线

```
Rust DTO (struct + #[derive(TS)])
        │ cargo test --lib
        ▼
packages/web/src/generated/rust-types/*.ts
        │ import type
        ▼
packages/web/src/generated/rust-api/*.ts  (手动编写 hooks)
        │ import
        ▼
packages/web/src/components/*.tsx  (业务组件)
```

### 命令

```bash
make gen:api   # 运行 scripts/gen-rust-api.mjs → ts-rs 导出 + 后处理
```

### 注意事项

- `generated/rust-types/` 中的文件是自动生成的，不要手动修改
- `generated/rust-api/` 中的 hooks 是手动编写的，需要手动维护
- 修改 Rust DTO 后必须重新运行 `make gen:api`
