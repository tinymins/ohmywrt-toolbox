import type { LoaderFunctionArgs, MetaFunction } from "react-router";

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
        { title: "Sign In — OhMyWRT Toolbox" },
        {
          name: "description",
          content:
            "Sign in to OhMyWRT Toolbox and start building with the OhMyWRT Toolbox.",
        },
        { name: "robots", content: "noindex, nofollow" },
      ]
    : [
        { title: "登录 — OhMyWRT Toolbox" },
        {
          name: "description",
          content: "登录到 OhMyWRT Toolbox，开始使用 OhMyWRT 工具箱。",
        },
        { name: "robots", content: "noindex, nofollow" },
      ];

export { default } from "@/components/auth/AuthPage";
