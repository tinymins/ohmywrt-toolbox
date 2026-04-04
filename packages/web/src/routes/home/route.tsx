import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import LandingPage from "@/components/site/landing/LandingPage";

const SITE_URL = import.meta.env.VITE_SITE_URL ?? "https://localhost:5173";

function parseLang(cookieHeader: string): "zh-CN" | "en" {
  const match = cookieHeader.match(/(?:^|;\s*)i18next=([^;]+)/);
  return match?.[1] === "en" ? "en" : "zh-CN";
}

export async function loader({ request }: LoaderFunctionArgs) {
  const lang = parseLang(request.headers.get("Cookie") ?? "");
  return { lang };
}

const META = {
  "zh-CN": {
    title: "AI Stack — AI 全栈应用模板",
    description:
      "基于 TypeScript 的全栈应用模板。tRPC · React 19 · Hono · Prisma · PostgreSQL.",
    ogTitle: "AI Stack — AI 全栈应用模板",
    ogLocale: "zh_CN",
    ogLocaleAlt: "en_US",
  },
  en: {
    title: "AI Stack — AI Full-Stack Application Template",
    description:
      "A full-stack application template built with TypeScript. tRPC · React 19 · Hono · Prisma · PostgreSQL.",
    ogTitle: "AI Stack — AI Full-Stack Template",
    ogLocale: "en_US",
    ogLocaleAlt: "zh_CN",
  },
} as const;

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  const m = META[data?.lang ?? "zh-CN"];
  return [
    { title: m.title },
    { name: "description", content: m.description },
    {
      name: "keywords",
      content:
        "AI coding, full-stack template, tRPC, React, Hono, Prisma, TypeScript, boilerplate",
    },
    // Open Graph
    { property: "og:type", content: "website" },
    { property: "og:url", content: SITE_URL },
    { property: "og:site_name", content: "AI Stack" },
    { property: "og:title", content: m.ogTitle },
    { property: "og:description", content: m.description },
    { property: "og:locale", content: m.ogLocale },
    { property: "og:locale:alternate", content: m.ogLocaleAlt },
    // Twitter Card
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: m.ogTitle },
    { name: "twitter:description", content: m.description },
    // Canonical
    { tagName: "link", rel: "canonical", href: SITE_URL },
  ];
};

export default function HomeRoute() {
  return <LandingPage />;
}
