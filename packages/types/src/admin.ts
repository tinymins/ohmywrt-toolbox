import { z } from "zod";
import { UserRoleSchema } from "./user";

export const SystemSettingsSchema = z.object({
  allowRegistration: z.boolean(),
  singleWorkspaceMode: z.boolean(),
  singleWorkspaceModeOverridden: z.boolean().optional(),
});

export const SystemSettingsPatchSchema = SystemSettingsSchema.partial();

export type SystemSettings = z.infer<typeof SystemSettingsSchema>;

export const InvitationCodeSchema = z.object({
  id: z.string(),
  code: z.string(),
  createdBy: z.string(),
  usedBy: z.string().nullable(),
  usedAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
  createdAt: z.string(),
});

export type InvitationCode = z.infer<typeof InvitationCodeSchema>;

export const AdminUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: UserRoleSchema,
  lastLoginAt: z.string().nullable(),
  createdAt: z.string(),
});

export type AdminUser = z.infer<typeof AdminUserSchema>;

export const CreateUserInputSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(4),
  role: UserRoleSchema.optional(),
});

export const UpdateUserRoleInputSchema = z.object({
  userId: z.string(),
  role: UserRoleSchema,
});

export const ForceResetPasswordInputSchema = z.object({
  userId: z.string(),
  newPassword: z.string().min(4),
});

export const GenerateInvitationCodeInputSchema = z.object({
  expiresInHours: z.number().positive().optional(),
});

export type CreateUserInput = z.infer<typeof CreateUserInputSchema>;
export type UpdateUserRoleInput = z.infer<typeof UpdateUserRoleInputSchema>;
export type ForceResetPasswordInput = z.infer<
  typeof ForceResetPasswordInputSchema
>;
export type GenerateInvitationCodeInput = z.infer<
  typeof GenerateInvitationCodeInputSchema
>;
