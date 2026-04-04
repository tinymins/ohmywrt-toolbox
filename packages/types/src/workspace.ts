import { z } from "zod";

/**
 * System-reserved shared workspace slug.
 * Uses special character pattern that cannot conflict with user-created slugs.
 */
export const SYSTEM_SHARED_SLUG = "::SYSTEM_SHARED::";

/** Convert any string to a URL-safe slug. */
export const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

export const WorkspaceSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  ownerId: z.string().nullable().optional(),
  createdAt: z.string().optional(),
});

export const CreateWorkspaceInputSchema = z.object({
  name: z.string().min(1, "Name cannot be empty"),
  slug: z
    .string()
    .min(1, "Slug cannot be empty")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug can only contain lowercase letters, digits, and hyphens",
    )
    .optional(),
  description: z.string().optional(),
});

export const UpdateWorkspaceInputSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z
    .string()
    .min(1)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug can only contain lowercase letters, digits, and hyphens",
    )
    .optional(),
  description: z.string().nullable().optional(),
});

export const DeleteWorkspaceInputSchema = z.object({
  id: z.string(),
});

export type Workspace = z.infer<typeof WorkspaceSchema>;
export type CreateWorkspaceInput = z.infer<typeof CreateWorkspaceInputSchema>;
export type UpdateWorkspaceInput = z.infer<typeof UpdateWorkspaceInputSchema>;
export type DeleteWorkspaceInput = z.infer<typeof DeleteWorkspaceInputSchema>;
