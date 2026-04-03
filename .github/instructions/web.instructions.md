---
description: "Use when working on frontend code: React components, hooks, pages, TailwindCSS styling, tRPC client calls, or UI architecture in packages/web."
applyTo: "packages/web/**"
---

# Frontend Patterns

## Framework

- **React Router v7** with SSR (server-side rendering)
- **Vite 7** for dev server and build
- **TailwindCSS 4** for all styling — no antd, no @ant-design/icons
- **Lucide React** for icons — `lucide-react`
- **Bun** as the production SSR runtime (`server.mjs`)
- **禁止**直接 `fetch()` 绕过 tRPC client

## Route Structure

Routes are defined in `src/routes.ts` using React Router v7 conventions:

```typescript
export default [
  index("routes/home/route.tsx"),
  route("login", "routes/login/route.tsx"),
  route("register", "routes/register/route.tsx"),
  route("dashboard", "routes/dashboard/route.tsx", [
    index("routes/dashboard/_index/route.tsx"),
    route(":workspace", "routes/dashboard/$workspace/route.tsx", [
      index("routes/dashboard/$workspace/_index/route.tsx"),
      route(":page", "routes/dashboard/$workspace/$page/route.tsx"),
    ]),
  ]),
] satisfies RouteConfig;
```

### Route Module Pattern

Each route module can export `loader`, `meta`, and a default component:

```typescript
// routes/login/route.tsx
import type { LoaderFunctionArgs, MetaFunction } from "react-router";

export async function loader({ request }: LoaderFunctionArgs) {
  const lang = parseLang(request.headers.get("Cookie") ?? "");
  return { lang };
}

export const meta: MetaFunction<typeof loader> = ({ data }) =>
  data?.lang === "en"
    ? [{ title: "Sign In" }, { name: "robots", content: "noindex, nofollow" }]
    : [{ title: "登录" }, { name: "robots", content: "noindex, nofollow" }];

export { default } from "@/components/auth/AuthPage";
```

## Component Architecture

| Type | Location | Rule |
|------|----------|------|
| Generic UI | `@acme/components`（`packages/components/src/`） | Pure UI, no API calls, no business logic |
| Business | `packages/web/src/components/` | May call tRPC, contains business logic, uses i18n |

Before creating a component: check `packages/components/src/` first. If it exists, reuse or extend it (add props). Only create a new generic component there if it's pure UI. Only create in `packages/web/src/components/` if it needs API access.

Generic: Button, Modal, Input, Select, Avatar, Badge, Spinner, Toaster
Business: UserMenu, DashboardLayout, CreateWorkspaceModal, AdminPanel

## Styling

- TailwindCSS 4 only — plain HTML elements with Tailwind classes
- No inline styles unless dynamic values are needed
- Design tokens via CSS variables in `packages/components/src/styles/tokens.css`

### CSS Variables Theming

```css
/* packages/components/src/styles/tokens.css */
:root {
  --ui-bg: #ffffff;
  --ui-text: #18181b;
  --ui-border: #e4e4e7;
  --ui-btn-primary-bg: #18181b;
  /* ... */
}
.dark {
  --ui-bg: #09090b;
  --ui-text: #fafafa;
  --ui-border: #27272a;
  --ui-btn-primary-bg: #fafafa;
  /* ... */
}
```

Theme toggling: `document.documentElement.classList.add/remove("dark")`.
Preference stored in cookies (`themeMode`, `langMode`) via `src/lib/preferences.ts`.

## tRPC Client Usage

```typescript
import { trpc } from "@/lib/trpc";

// Query
const { data, isLoading, error } = trpc.user.getProfile.useQuery();

// Mutation
const updateMutation = trpc.user.updateProfile.useMutation({
  onSuccess: () => { /* handle success */ }
});
```

The tRPC client is configured in `src/root.tsx` with:
- `httpBatchLink` pointing to `/trpc`
- `credentials: "include"` for cookie-based auth
- `x-workspace-id` header extracted from URL path
- `x-lang` header from i18next resolved language

## Providers

Root layout (`src/root.tsx`) wraps the app with these providers:

```
QueryClientProvider > trpc.Provider > I18nextProvider > ThemeProvider > LangProvider > MessageProvider > AuthProvider
```

## i18n

```typescript
import { useTranslation } from "react-i18next";
const { t } = useTranslation();
// t("common:save"), t("user:profile")
```

Add translations to both `packages/i18n/src/locales/en/` and `zh/`. **Never hardcode UI strings — always use i18n keys.**

## Error Pages

Use `ErrorPage` from `@/components/error/ErrorPage`. Required props:

```tsx
<ErrorPage
  code="404"
  title={t("common.notFoundTitle")}
  description={t("common.notFoundDesc")}
  variant="primary"                      // "primary" (blue) | "danger" (red)
  secondaryLabel={t("common.backToPrevious")}
/>
```

Icons are hardcoded by variant. `primaryTo` defaults to `"/"`.

## Extracting Async Side Effects to Hooks

When a component manages async operations (file upload, multi-step mutations), extract to a hook to keep the component focused on rendering:

```typescript
// packages/web/src/hooks/useAvatarUpload.ts — example pattern
export function useAvatarUpload(user: User, onUpdateUser: (u: User) => void) {
  const [key, setKey] = useState(user.settings?.avatarKey ?? "");
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => { ... };

  return { key, url: resolveAvatarUrl(key), uploading, handleFileChange };
}
```

## Available Hooks

| Hook | Purpose |
|------|---------|
| `useAuth` | Authentication state and user context |
| `useTheme` | Theme mode management (light/dark/auto) |
| `useLang` | Language mode management (zh/en/auto) |
| `useWorkspace` | Workspace context from URL |
| `useAvatarUpload` | Avatar file upload handling |
| `useTrpcQueryClient` | Query client configuration |

## Storage / File URL

- Backend returns `key` (e.g. `userId/1234.jpg`), never a full URL
- Use `resolveAvatarUrl(key)` from `@/lib/avatar` to get the full URL for display
- Base URL comes from `VITE_STORAGE_PUBLIC_URL` env var

```typescript
import { resolveAvatarUrl } from "@/lib/avatar";
<Avatar url={resolveAvatarUrl(user.settings?.avatarKey)} />
```
