import { useTranslation } from "react-i18next";
import type { MetaFunction } from "react-router";
import ErrorPage from "@/components/error/ErrorPage";
import { parseLangFromCookie, serverT } from "@/lib/server-i18n";

export async function clientLoader() {
  return { lang: parseLangFromCookie(document.cookie) };
}

export const meta: MetaFunction<typeof clientLoader> = ({ data }) => {
  const lang = data?.lang ?? "zh-CN";
  return [
    { title: serverT(lang, "common.meta.notFoundTitle") },
    { name: "robots", content: "noindex, nofollow" },
  ];
};

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
