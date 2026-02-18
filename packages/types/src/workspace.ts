import { z } from "zod";

/**
 * 系统保留的共享工作空间 slug
 * 使用特殊字符模式，确保无法被用户创建的 slug 冲突
 */
export const SYSTEM_SHARED_SLUG = "::SYSTEM_SHARED::";

// Zod schemas for workspace (single source of truth)
export const WorkspaceSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  ownerId: z.string().nullable().optional(),
  createdAt: z.string().optional(), // ISO 8601 string
});

export const CreateWorkspaceInputSchema = z.object({
  name: z.string().min(1, "名称不能为空"),
  slug: z
    .string()
    .min(1, "标识不能为空")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "标识只能包含小写字母、数字和连字符，且不能以连字符开头或结尾",
    )
    .optional(),
  description: z.string().optional(),
});

export const UpdateWorkspaceInputSchema = z.object({
  id: z.string(),
  name: z.string().min(1).optional(),
  slug: z
    .string()
    .min(1)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "标识只能包含小写字母、数字和连字符，且不能以连字符开头或结尾",
    )
    .optional(),
  description: z.string().nullable().optional(),
});

export const DeleteWorkspaceInputSchema = z.object({
  id: z.string(),
});

// Inferred TypeScript types
export type Workspace = z.infer<typeof WorkspaceSchema>;
export type CreateWorkspaceInput = z.infer<typeof CreateWorkspaceInputSchema>;
export type UpdateWorkspaceInput = z.infer<typeof UpdateWorkspaceInputSchema>;
export type DeleteWorkspaceInput = z.infer<typeof DeleteWorkspaceInputSchema>;
