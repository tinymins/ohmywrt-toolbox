---
applyTo: "packages/**"
---

# 编码规范

## 必须遵守

1. **禁止 `any`** — 使用 `unknown` + 类型守卫
2. **禁止 Prettier / ESLint** — 使用 Biome（`make lint`）
3. **禁止静默忽略错误** — catch 块必须记录或重新抛出
4. **单文件 ≤ 500 行** — 超出则拆分为子组件 / hooks / types / constants
5. **可点击元素** — 所有可点击元素必须设置 `cursor-pointer`

## 示例

```typescript
// ❌
function process(data: any) {}
try { } catch { }

// ✅
function process(data: unknown) { if (typeof data === "string") { ... } }
try { } catch (e) { logger.error(e); throw e; }
```

## 命名

| 类别 | 规范 |
|------|------|
| 类 | `PascalCase` |
| 函数 / 变量 | `camelCase` |
| 常量 | `UPPER_SNAKE_CASE` |
| TS 文件 | `kebab-case.ts` |
| React 组件 | `PascalCase.tsx` |
