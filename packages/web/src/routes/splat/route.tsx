import { useTranslation } from "react-i18next";
import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import ErrorPage from "@/components/error/ErrorPage";
import { parseLangFromCookie, serverT } from "@/lib/server-i18n";

export async function loader({ request }: LoaderFunctionArgs) {
  return { lang: parseLangFromCookie(request.headers.get("Cookie") ?? "") };
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
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
