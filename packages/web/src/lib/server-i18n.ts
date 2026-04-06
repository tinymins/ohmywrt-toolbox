import { deDE, enUS, jaJP, zhCN, zhTW } from "@acme/i18n";

export type Lang = "zh-CN" | "en-US" | "de-DE" | "ja-JP" | "zh-TW";

const resources: Record<Lang, Record<string, unknown>> = {
  "zh-CN": zhCN.translation,
  "en-US": enUS.translation,
  "de-DE": deDE.translation,
  "ja-JP": jaJP.translation,
  "zh-TW": zhTW.translation,
};

/** Parse the i18next cookie and return a canonical BCP 47 lang tag. */
export function parseLangFromCookie(cookieHeader: string): Lang {
  let header = cookieHeader;
  // SPA mode: request.headers won't have cookies; fall back to document.cookie
  if (!header && typeof document !== "undefined") {
    header = document.cookie;
  }
  const match = header.match(/(?:^|;\s*)i18next=([^;]+)/);
  const raw = match?.[1] ?? "";
  if (raw.startsWith("en")) return "en-US";
  if (raw.startsWith("de")) return "de-DE";
  if (raw.startsWith("ja")) return "ja-JP";
  if (raw === "zh-TW" || raw.toLowerCase().includes("hant")) return "zh-TW";
  return "zh-CN";
}

/** Server-side translation lookup by dot-separated key (e.g. "common.meta.homeTitle"). */
export function serverT(lang: Lang, key: string): string {
  const bundle = resources[lang] ?? resources["zh-CN"];
  const parts = key.split(".");
  let value: unknown = bundle;
  for (const part of parts) {
    if (value && typeof value === "object") {
      value = (value as Record<string, unknown>)[part];
    } else {
      return key;
    }
  }
  return typeof value === "string" ? value : key;
}

/** Convert BCP 47 lang tag to Open Graph locale format (e.g. "zh-CN" → "zh_CN"). */
export function langToOgLocale(lang: Lang): string {
  return lang.replace("-", "_");
}
