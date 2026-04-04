import { createQuery, createMutation } from "@/lib/rust-api-runtime";
import type {
  User,
  UserUpdateInput,
  ChangePasswordInput,
  ChangePasswordOutput,
} from "@acme/types";

export const userApi = {
  getProfile: createQuery<void, User>({
    path: "/api/user/profile",
  }),
  updateProfile: createMutation<UserUpdateInput, User>({
    method: "PATCH",
    path: "/api/user/profile",
  }),
  deleteAvatar: createMutation<void, User>({
    method: "DELETE",
    path: "/api/user/avatar",
  }),
  changePassword: createMutation<ChangePasswordInput, ChangePasswordOutput>({
    path: "/api/user/change-password",
  }),
};
