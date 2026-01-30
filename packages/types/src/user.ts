import { z } from "zod";

// 用户角色：superadmin > admin > user
export const UserRoleSchema = z.enum(["superadmin", "admin", "user"]);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserSettingsSchema = z.object({
  avatarUrl: z.string().nullable().optional(),
  langMode: z.enum(["auto", "zh", "en"]).optional(),
  themeMode: z.enum(["auto", "light", "dark"]).optional()
});

export const UserSettingsPatchSchema = UserSettingsSchema.partial();

export type UserSettings = z.infer<typeof UserSettingsSchema>;

export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  role: UserRoleSchema,
  settings: UserSettingsSchema.nullable().optional()
});

export type User = z.infer<typeof UserSchema>;

// 系统设置 Schema
export const SystemSettingsSchema = z.object({
  allowRegistration: z.boolean()
});

export type SystemSettings = z.infer<typeof SystemSettingsSchema>;

// 管理员操作 - 用户列表项
export const AdminUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  role: UserRoleSchema,
  lastLoginAt: z.string().nullable(),
  createdAt: z.string()
});

export type AdminUser = z.infer<typeof AdminUserSchema>;

// 管理员操作 - 更新用户角色输入
export const UpdateUserRoleInputSchema = z.object({
  userId: z.string(),
  role: UserRoleSchema
});

export type UpdateUserRoleInput = z.infer<typeof UpdateUserRoleInputSchema>;

// 管理员操作 - 强制重置密码输入
export const ForceResetPasswordInputSchema = z.object({
  userId: z.string(),
  newPassword: z.string().min(4)
});

export type ForceResetPasswordInput = z.infer<typeof ForceResetPasswordInputSchema>;

// 管理员操作 - 创建用户输入
export const CreateUserInputSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(4),
  role: UserRoleSchema.default("user")
});

export type CreateUserInput = z.infer<typeof CreateUserInputSchema>;
