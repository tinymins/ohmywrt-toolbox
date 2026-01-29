import { useEffect, useMemo } from "react";
import { Route, Routes, Navigate } from "react-router-dom";
import { App as AntdApp } from "antd";
import { TRPCClientError } from "@trpc/client";
import { QueryClient } from "@tanstack/react-query";
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
  RequirementsPage,
  TestRequirementsPage,
  TestPlanPage,
  TestDesignPage,
  ExecutionPage,
  DefectsPage,
  ReportsPage,
  AutomationPage,
  SettingsPage,
  TodoListPage,
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

  // Sync theme/lang from user settings only when user data changes (not on setter changes)
  useEffect(() => {
    if (user?.settings?.themeMode) {
      setThemeMode(user.settings.themeMode);
    }
    if (user?.settings?.langMode) {
      setLangMode(user.settings.langMode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.settings?.themeMode, user?.settings?.langMode]);

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
              <Route path="requirements" element={<RequirementsPage lang={lang} />} />
              <Route path="test-requirements" element={<TestRequirementsPage lang={lang} />} />
              <Route path="test-plan" element={<TestPlanPage lang={lang} />} />
              <Route path="test-design" element={<TestDesignPage lang={lang} />} />
              <Route path="execution" element={<ExecutionPage lang={lang} />} />
              <Route path="defects" element={<DefectsPage lang={lang} />} />
              <Route path="reports" element={<ReportsPage lang={lang} />} />
              <Route path="automation" element={<AutomationPage lang={lang} />} />
              <Route path="settings" element={<SettingsPage lang={lang} />} />
              <Route path="todulist" element={<TodoListPage lang={lang} />} />
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
        defaultOptions: {
          queries: {
            retry: 1,
            onError: handleTrpcError
          },
          mutations: {
            onError: handleTrpcError
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
