import "./index.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useEffect, useMemo } from "react";
import { I18nextProvider } from "react-i18next";
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import { MessageProvider } from "./components/providers/MessageProvider";
import {
  AuthProvider,
  LangProvider,
  SystemSettingsProvider,
  ThemeProvider,
  useAuth,
  useLang,
  useTheme,
} from "./hooks";
import { type ErrorDisplay, ErrorDisplayContext } from "./lib/error-display";
import i18n from "./lib/i18n";
import { message } from "./lib/message";

/** Syncs the user's theme/lang preferences to global context after login */
function ThemeLangSync() {
  const { user } = useAuth();
  const { setThemeMode } = useTheme();
  const { setLangMode } = useLang();

  useEffect(() => {
    if (user) {
      // Logged in: prefer user settings; fall back to cookie / browser-detected value if not set
      if (user.settings?.themeMode) setThemeMode(user.settings.themeMode);
      if (user.settings?.langMode) setLangMode(user.settings.langMode);
    } else {
      // Not logged in: force dark theme; keep language from cookie / browser auto-detection
      setThemeMode("dark");
    }
  }, [user, setThemeMode, setLangMode]);

  return null;
}

const errorDisplay: ErrorDisplay = {
  error: (msg) => message.error(msg),
  success: (msg) => message.success(msg),
  warning: (msg) => message.warning(msg),
  info: (msg) => message.info(msg),
};

function Providers({ children }: { children: ReactNode }) {
  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1 },
        },
      }),
    [],
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorDisplayContext.Provider value={errorDisplay}>
        <I18nextProvider i18n={i18n}>
          <ThemeProvider>
            <LangProvider>
              <MessageProvider>
                <AuthProvider>
                  <SystemSettingsProvider>
                    <ThemeLangSync />
                    {children}
                  </SystemSettingsProvider>
                </AuthProvider>
              </MessageProvider>
            </LangProvider>
          </ThemeProvider>
        </I18nextProvider>
      </ErrorDisplayContext.Provider>
    </QueryClientProvider>
  );
}

export default function Root() {
  return (
    <html lang="zh-CN">
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <meta name="theme-color" content="#18181b" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <Meta />
        <Links />
      </head>
      <body>
        <Providers>
          <Outlet />
        </Providers>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
