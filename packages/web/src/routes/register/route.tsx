import type { MetaFunction } from "react-router";
import AuthPage from "@/components/auth/AuthPage";
import { parseLangFromCookie, serverT } from "@/lib/server-i18n";

export async function clientLoader() {
  return { lang: parseLangFromCookie(document.cookie) };
}

export const meta: MetaFunction<typeof clientLoader> = ({ data }) => {
  const lang = data?.lang ?? "zh-CN";
  return [
    { title: serverT(lang, "common.meta.registerTitle") },
    {
      name: "description",
      content: serverT(lang, "common.meta.registerDescription"),
    },
    { name: "robots", content: "noindex, nofollow" },
  ];
};

export default function RegisterRoute() {
  return <AuthPage initialMode="register" />;
}
