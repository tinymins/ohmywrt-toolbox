import { useTranslation } from "react-i18next";
import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import ErrorPage from "@/components/error/ErrorPage";

function parseLang(cookieHeader: string): "zh-CN" | "en" {
  const m = cookieHeader.match(/(?:^|;\s*)i18next=([^;]*)/);
  return m?.[1] === "en" ? "en" : "zh-CN";
}

export async function loader({ request }: LoaderFunctionArgs) {
  return { lang: parseLang(request.headers.get("Cookie") ?? "") };
}

export const meta: MetaFunction<typeof loader> = ({ data }) => [
  {
    title:
      data?.lang === "en"
        ? "Page Not Found — OhMyWRT Toolbox"
        : "页面不存在 — OhMyWRT Toolbox",
  },
  { name: "robots", content: "noindex, nofollow" },
];

export default function NotFoundRoute() {
  const { t } = useTranslation();
  return (
    <ErrorPage
      code="404"
      title={t("common.notFoundTitle")}
      description={t("common.notFoundDesc")}
      variant="primary"
      secondaryLabel={t("common.backToPrevious")}
    />
  );
}
