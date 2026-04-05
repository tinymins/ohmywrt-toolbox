import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { parseLangFromCookie, serverT } from "@/lib/server-i18n";

export async function loader({ request }: LoaderFunctionArgs) {
  return { lang: parseLangFromCookie(request.headers.get("Cookie") ?? "") };
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  const lang = data?.lang ?? "zh-CN";
  return [
    { title: serverT(lang, "common.meta.loginTitle") },
    {
      name: "description",
      content: serverT(lang, "common.meta.loginDescription"),
    },
    { name: "robots", content: "noindex, nofollow" },
  ];
};

export { default } from "@/components/auth/AuthPage";
