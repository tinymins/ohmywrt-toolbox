---
applyTo: "packages/components/**"
---

# UI 组件库说明

自研通用组件库，**禁止**引入 Ant Design / MUI / shadcn 等第三方 UI 框架。

## 技术栈

- **Tailwind CSS v4** — 样式，`dark:` 变体支持暗色模式
- **Floating UI** — 浮层定位（Dropdown / Select / Popover / Tooltip）
- **Lucide React** — 图标（从 `lucide-react` 直接导入）

## 开发规范

- Props 用 `interface XxxProps`，可扩展原生 HTML 属性
- 样式只用 Tailwind class，用 `cn()` 合并条件 className，禁止内联 `style={{}}`
- 暗色模式必须添加 `dark:` 变体
- 弹窗 / 浮层用 `createPortal()` 渲染，且必须添加 SSR 安全守卫（`useState(false)` + `useEffect`）
- 禁止包含业务逻辑 / API 调用
- 新增组件后在 `src/index.ts` 添加 export
- 设计令牌定义在 `src/styles/tokens.css`（`:root` / `.dark` CSS 变量）
