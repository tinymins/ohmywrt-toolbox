import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import AuthPage from "@/components/auth/AuthPage";

function parseLang(cookieHeader: string): "zh-CN" | "en" {
  const m = cookieHeader.match(/(?:^|;\s*)i18next=([^;]*)/);
  return m?.[1] === "en" ? "en" : "zh-CN";
}

export async function loader({ request }: LoaderFunctionArgs) {
  return { lang: parseLang(request.headers.get("Cookie") ?? "") };
}

export const meta: MetaFunction<typeof loader> = ({ data }) =>
  data?.lang === "en"
    ? [
        { title: "Register — OhMyWRT Toolbox" },
        {
          name: "description",
          content:
            "Create a OhMyWRT Toolbox account and manage your OpenWrt network tools.",
        },
        { name: "robots", content: "noindex, nofollow" },
      ]
    : [
        { title: "注册 — OhMyWRT Toolbox" },
        {
          name: "description",
          content: "创建 OhMyWRT Toolbox 账号，管理您的 OpenWrt 网络工具。",
        },
        { name: "robots", content: "noindex, nofollow" },
      ];

export default function RegisterRoute() {
  return <AuthPage initialMode="register" />;
}
