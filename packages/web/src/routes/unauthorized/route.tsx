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
    { title: serverT(lang, "common.meta.unauthorizedTitle") },
    { name: "robots", content: "noindex, nofollow" },
  ];
};

export default function UnauthorizedRoute() {
  const { t } = useTranslation();
  return (
    <ErrorPage
      code="403"
      title={t("common.unauthorizedTitle")}
      description={t("common.unauthorizedDesc")}
      variant="danger"
      secondaryLabel={t("common.signIn")}
      secondaryTo="/login"
    />
  );
}
