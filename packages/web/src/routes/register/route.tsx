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
        { title: "Register — AI Stack" },
        {
          name: "description",
          content:
            "Create a AI Stack account and start building production-grade apps with AI Coding.",
        },
        { name: "robots", content: "noindex, nofollow" },
      ]
    : [
        { title: "注册 — AI Stack" },
        {
          name: "description",
          content: "创建 AI Stack 账号，开始用 AI Coding 构建生产级应用。",
        },
        { name: "robots", content: "noindex, nofollow" },
      ];

export default function RegisterRoute() {
  return <AuthPage initialMode="register" />;
}
