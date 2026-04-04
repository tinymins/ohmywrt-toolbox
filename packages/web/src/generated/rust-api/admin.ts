import { createQuery, createMutation } from "@/lib/rust-api-runtime";
import type {
  AdminUser,
  CreateUserInput,
  UpdateUserRoleInput,
  ForceResetPasswordInput,
  GenerateInvitationCodeInput,
  InvitationCode,
  SystemSettings,
} from "@acme/types";

export const adminApi = {
  listUsers: createQuery<void, AdminUser[]>({
    path: "/api/admin/users",
  }),
  createUser: createMutation<CreateUserInput, AdminUser>({
    path: "/api/admin/users",
  }),
  updateUserRole: createMutation<UpdateUserRoleInput, AdminUser>({
    method: "PATCH",
    path: "/api/admin/users/role",
  }),
  forceResetPassword: createMutation<ForceResetPasswordInput, void>({
    path: "/api/admin/users/reset-password",
  }),
  deleteUser: createMutation<{ userId: string }, void>({
    method: "DELETE",
    path: "/api/admin/users",
    pathFn: (input) =>
      `/api/admin/users/${encodeURIComponent(input.userId)}`,
  }),
  generateInvitationCode: createMutation<
    GenerateInvitationCodeInput,
    InvitationCode
  >({
    path: "/api/admin/invitation-codes",
  }),
  listInvitationCodes: createQuery<void, InvitationCode[]>({
    path: "/api/admin/invitation-codes",
  }),
  deleteInvitationCode: createMutation<{ code: string }, void>({
    method: "DELETE",
    path: "/api/admin/invitation-codes",
    pathFn: (input) =>
      `/api/admin/invitation-codes/${encodeURIComponent(input.code)}`,
  }),
  getSystemSettings: createQuery<void, SystemSettings>({
    path: "/api/admin/settings",
  }),
  updateSystemSettings: createMutation<Partial<SystemSettings>, SystemSettings>(
    {
      method: "PATCH",
      path: "/api/admin/settings",
    },
  ),
};
