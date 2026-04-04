import { z } from "zod";

export type Theme = "light" | "dark";
export type ThemeMode = "auto" | Theme;
export type Lang = "zh-CN" | "en-US" | "de-DE" | "ja-JP" | "zh-TW";
export type LangMode = "auto" | Lang;

export const ACCENT_COLORS = [
  "emerald",
  "amber",
  "rose",
  "violet",
  "blue",
  "cyan",
] as const;
export type AccentColor = (typeof ACCENT_COLORS)[number];

export const UserSettingsSchema = z.object({
  avatarKey: z.string().nullable().optional(),
  langMode: z
    .enum(["auto", "zh-CN", "en-US", "de-DE", "ja-JP", "zh-TW"])
    .optional(),
  themeMode: z.enum(["auto", "light", "dark"]).optional(),
  accentColor: z
    .enum(["emerald", "amber", "rose", "violet", "blue", "cyan"])
    .optional(),
});

export const UserSettingsPatchSchema = UserSettingsSchema.partial();

export type UserSettings = z.infer<typeof UserSettingsSchema>;

export const UserRoleSchema = z.enum(["superadmin", "admin", "user"]);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  role: UserRoleSchema,
  settings: UserSettingsSchema.nullable().optional(),
});

export type User = z.infer<typeof UserSchema>;
