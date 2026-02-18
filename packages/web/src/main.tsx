import "./index.css";

import { StyleProvider } from "@ant-design/cssinjs";
import { httpBatchLink } from "@trpc/client";
import { App as AntdApp, theme as antdTheme, ConfigProvider } from "antd";
import React from "react";
import ReactDOM from "react-dom/client";
import { I18nextProvider } from "react-i18next";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { ThemeProvider, useThemeContext } from "./hooks";
import i18n from "./lib/i18n";
import { trpc } from "./lib/trpc";

// 系统保留的共享空间 slug
export const SYSTEM_SHARED_SLUG = "::SYSTEM_SHARED::";

const getWorkspaceFromPath = () => {
  if (typeof window === "undefined") return undefined;
  const match = window.location.pathname.match(/^\/dashboard\/([^/]+)/);
  // If we're on /dashboard (single workspace mode), return system shared slug
  if (!match && window.location.pathname.startsWith("/dashboard")) {
    return SYSTEM_SHARED_SLUG;
  }
  return match?.[1];
};

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: import.meta.env.VITE_TRPC_URL || "/trpc",
      fetch(url, options) {
        return fetch(url, { ...options, credentials: "include" });
      },
      headers() {
        const workspaceSlug = getWorkspaceFromPath();
        return {
          ...(workspaceSlug ? { "x-workspace-id": workspaceSlug } : {}),
          "x-lang": i18n.resolvedLanguage ?? i18n.language ?? "zh-CN",
        };
      },
    }),
  ],
});

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

// 将 React root 存储在 window 上以支持 HMR
// 不能用模块级 const，因为 Vite HMR 会重新执行整个模块，
// 导致 createRoot() 被重复调用并报错。window 对象在页面生命周期内持久存在。
declare global {
  interface Window {
    __REACT_ROOT__?: ReactDOM.Root;
  }
}

window.__REACT_ROOT__ ??= ReactDOM.createRoot(rootElement);

function AppWrapper() {
  const { theme } = useThemeContext();

  return (
    <StyleProvider>
      <ConfigProvider
        theme={{
          algorithm:
            theme === "dark"
              ? antdTheme.darkAlgorithm
              : antdTheme.defaultAlgorithm,
        }}
      >
        <AntdApp>
          <App trpcClient={trpcClient} />
        </AntdApp>
      </ConfigProvider>
    </StyleProvider>
  );
}

window.__REACT_ROOT__.render(
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      <BrowserRouter>
        <ThemeProvider>
          <AppWrapper />
        </ThemeProvider>
      </BrowserRouter>
    </I18nextProvider>
  </React.StrictMode>,
);
