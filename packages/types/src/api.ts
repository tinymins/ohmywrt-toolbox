import { z } from "zod";
import { UserSchema, UserSettingsPatchSchema } from "./user";

export const LoginInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const RegisterInputSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  invitationCode: z.string().optional(),
});

export const AuthOutputSchema = z.object({
  user: UserSchema,
  defaultWorkspaceSlug: z.string(),
});

export const LogoutOutputSchema = z.object({
  success: z.boolean(),
});

export const RegistrationStatusSchema = z.object({
  allowed: z.boolean(),
  isFirstUser: z.boolean(),
});

export const UserProfileOutputSchema = UserSchema;

export const UserUpdateInputSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  settings: UserSettingsPatchSchema.nullable().optional(),
});

export const ChangePasswordInputSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export const ChangePasswordOutputSchema = z.object({
  success: z.boolean(),
});

export type LoginInput = z.infer<typeof LoginInputSchema>;
export type RegisterInput = z.infer<typeof RegisterInputSchema>;
export type AuthOutput = z.infer<typeof AuthOutputSchema>;
export type LogoutOutput = z.infer<typeof LogoutOutputSchema>;
export type RegistrationStatus = z.infer<typeof RegistrationStatusSchema>;
export type UserProfileOutput = z.infer<typeof UserProfileOutputSchema>;
export type UserUpdateInput = z.infer<typeof UserUpdateInputSchema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordInputSchema>;
export type ChangePasswordOutput = z.infer<typeof ChangePasswordOutputSchema>;
