import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import LandingPage from "@/components/site/landing/LandingPage";
import {
  langToOgLocale,
  parseLangFromCookie,
  serverT,
} from "@/lib/server-i18n";

const SITE_URL = import.meta.env.VITE_SITE_URL ?? "https://localhost:5173";

export async function loader({ request }: LoaderFunctionArgs) {
  return { lang: parseLangFromCookie(request.headers.get("Cookie") ?? "") };
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  const lang = data?.lang ?? "zh-CN";
  const title = serverT(lang, "common.meta.homeTitle");
  const description = serverT(lang, "common.meta.homeDescription");
  const ogTitle = serverT(lang, "common.meta.homeOgTitle");
  const ogLocale = langToOgLocale(lang);
  return [
    { title },
    { name: "description", content: description },
    {
      name: "keywords",
      content:
        "AI coding, full-stack template, tRPC, React, Hono, Prisma, TypeScript, boilerplate",
    },
    // Open Graph
    { property: "og:type", content: "website" },
    { property: "og:url", content: SITE_URL },
    { property: "og:site_name", content: "OhMyWRT Toolbox" },
    { property: "og:title", content: ogTitle },
    { property: "og:description", content: description },
    { property: "og:locale", content: ogLocale },
    // Twitter Card
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: ogTitle },
    { name: "twitter:description", content: description },
    // Canonical
    { tagName: "link", rel: "canonical", href: SITE_URL },
  ];
};

export default function HomeRoute() {
  return <LandingPage />;
}
