import { useMemo } from "react";
import { Route, Routes, Navigate } from "react-router-dom";
import { App as AntdApp } from "antd";
import { TRPCClientError } from "@trpc/client";
import { QueryClient, QueryCache, MutationCache } from "@tanstack/react-query";
import { useAuth, useThemeContext, useLang } from "./hooks";
import type { User } from "@acme/types";
import i18n from "./lib/i18n";
import { saveUser } from "./lib/storage";
import { trpc } from "./lib/trpc";
import { SiteLayout, HomePage } from "./components/site";
import { DashboardLayout } from "./components/dashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import {
  WorkspacePage,
  DashboardIndexRedirect,
  SettingsPage,
  ProxySubscribePage,
  ProxyRedirect,
  LoginPage,
  RegisterPage,
  NotFoundPage,
  DashboardNotFoundPage,
  UnauthorizedPage,
} from "./pages";

// Inner component that uses App.useApp() for message API
function AppContent() {
  const { user, isAuthed, login, updateUser, logout } = useAuth();
  const { theme, themeMode, setThemeMode } = useThemeContext();
  const { lang, langMode, setLangMode } = useLang();

  const handleLogin = (nextUser: User) => {
    login(nextUser);
    if (nextUser.settings?.themeMode) {
      setThemeMode(nextUser.settings.themeMode);
    }
    if (nextUser.settings?.langMode) {
      setLangMode(nextUser.settings.langMode);
    }
  };

  return (
    <Routes>
      <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
      <Route path="/register" element={<RegisterPage onLogin={handleLogin} />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
          <Route
            element={
              <SiteLayout
                user={user}
                theme={theme}
                themeMode={themeMode}
                lang={lang}
                langMode={langMode}
                onUpdateUser={updateUser}
                onLogout={logout}
                onChangeLangMode={setLangMode}
                onChangeThemeMode={setThemeMode}
              />
            }
          >
            <Route path="/" element={<HomePage />} />
          </Route>
          <Route element={<ProtectedRoute isAuthed={isAuthed} />}>
            {/* 重定向到默认工作空间 */}
            <Route path="/dashboard" element={<DashboardIndexRedirect />} />
            {/* Proxy 全局快捷路由 */}
            <Route path="/dashboard/proxy" element={<ProxyRedirect />} />

            <Route
              path="/dashboard/:workspace"
              element={
                <DashboardLayout
                  user={user}
                  lang={lang}
                  langMode={langMode}
                  theme={theme}
                  themeMode={themeMode}
                  onUpdateUser={updateUser}
                  onLogout={logout}
                  onChangeLangMode={setLangMode}
                  onChangeThemeMode={setThemeMode}
                />
              }
            >
              <Route index element={<WorkspacePage user={user} />} />
              <Route path="proxy" element={<ProxySubscribePage lang={lang} />} />
              <Route path="settings" element={<SettingsPage lang={lang} />} />
              <Route path="*" element={<DashboardNotFoundPage />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
  );
}

// Outer App component with all providers
export default function App({ trpcClient }: { trpcClient: ReturnType<typeof trpc.createClient> }) {
  const { message } = AntdApp.useApp();

  const isAuthPage = () =>
    typeof window !== "undefined" &&
    ["/login", "/register"].includes(window.location.pathname);

  const redirectToLogin = () => {
    if (typeof window === "undefined") return;
    if (isAuthPage()) return;
    const redirect = `${window.location.pathname}${window.location.search}`;
    const params = new URLSearchParams({ redirect });
    window.location.assign(`/login?${params.toString()}`);
  };

  const redirectToUnauthorized = () => {
    if (typeof window === "undefined") return;
    if (window.location.pathname === "/unauthorized") return;
    window.location.assign("/unauthorized");
  };

  const handleTrpcError = (error: unknown) => {
    if (error instanceof TRPCClientError) {
      const code = error.data?.code;
      if (code === "UNAUTHORIZED") {
        saveUser(null);
        message.error({
          content: error.message || i18n.t("errors.common.unauthorized"),
          key: "auth-error"
        });
        redirectToLogin();
        return;
      }
      if (code === "FORBIDDEN") {
        message.error({
          content: error.message || i18n.t("errors.common.forbidden"),
          key: "auth-error"
        });
        redirectToUnauthorized();
        return;
      }
      message.error({
        content: error.message || i18n.t("errors.common.requestFailed"),
        key: "trpc-error"
      });
      return;
    }

    if (error instanceof Error) {
      message.error({
        content: error.message || i18n.t("errors.common.requestFailed"),
        key: "trpc-error"
      });
    }
  };

  const queryClient = useMemo(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: handleTrpcError
        }),
        mutationCache: new MutationCache({
          onError: handleTrpcError
        }),
        defaultOptions: {
          queries: {
            retry: 1
          }
        }
      }),
    [message]
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <AppContent />
    </trpc.Provider>
  );
}
