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
      data?.lang === "en" ? "Unauthorized — AI Stack" : "无权访问 — AI Stack",
  },
  { name: "robots", content: "noindex, nofollow" },
];

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
