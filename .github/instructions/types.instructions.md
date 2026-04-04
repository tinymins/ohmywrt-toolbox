---
description: "Use when defining or modifying shared types, Zod schemas, or TypeScript interfaces in packages/types."
applyTo: "packages/types/**"
---

# Shared Types & Schemas

All shared types and Zod schemas live in `packages/types/src/`.

## File Organization

| File | Purpose |
|------|---------|
| `user.ts` | User entity schema + types |
| `workspace.ts` | Workspace entity schema + types |
| `admin.ts` | Admin schemas (AdminUser, SystemSettings, InvitationCode) |
| `api.ts` | API I/O schemas (input/output for tRPC procedures) |
| `index.ts` | Re-exports everything |

## Schema Pattern

```typescript
import { z } from "zod";

export const UserSettingsSchema = z.object({
  avatarKey: z.string().nullable().optional(), // storage key only — frontend resolves full URL
  langMode: z.enum(["auto", "zh", "en"]).optional(),
  themeMode: z.enum(["auto", "light", "dark"]).optional(),
});

export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  role: z.enum(["superadmin", "admin", "user"]),
  settings: UserSettingsSchema.nullable().optional(),
});

// Types are ALWAYS inferred from schemas — never defined separately
export type User = z.infer<typeof UserSchema>;
```

- **Zod v4** only (not v3 — APIs differ)
- Schema naming: `XxxSchema`, `CreateXxxInputSchema`, `UpdateXxxInputSchema`
- Always re-export new schemas/types from `index.ts`
- Storage fields store **keys only** (e.g. `avatarKey`), never full URLs — see Storage rules in copilot-instructions.md
