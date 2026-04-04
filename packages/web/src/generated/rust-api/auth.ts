import { createQuery, createMutation } from "@/lib/rust-api-runtime";
import type {
  AuthOutput,
  LoginInput,
  RegisterInput,
  RegistrationStatus,
  SystemSettings,
} from "@acme/types";

export const authApi = {
  login: createMutation<LoginInput, AuthOutput>({
    path: "/api/auth/login",
  }),
  register: createMutation<RegisterInput, AuthOutput>({
    path: "/api/auth/register",
  }),
  logout: createMutation<void, void>({
    path: "/api/auth/logout",
  }),
  systemSettings: createQuery<void, SystemSettings>({
    path: "/api/auth/system-settings",
  }),
  registrationStatus: createQuery<void, RegistrationStatus>({
    path: "/api/auth/registration-status",
  }),
};
