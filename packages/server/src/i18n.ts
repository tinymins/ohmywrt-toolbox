import type { TranslationSchema } from "@acme/i18n";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const i18nModule = require("@acme/i18n") as typeof import("@acme/i18n");

export type Language =
  | "zh-CN"
  | "zh-TW"
  | "en-US"
  | "ja-JP"
  | "de-DE"
  | "lzh"
  | "wuu"
  | "hak"
  | "yue";

const resources = {
  "zh-CN": i18nModule.zhCN,
  "zh-TW": i18nModule.zhTW,
  "en-US": i18nModule.enUS,
  "ja-JP": i18nModule.jaJP,
  "de-DE": i18nModule.deDE,
  lzh: i18nModule.lzh,
  wuu: i18nModule.wuu,
  hak: i18nModule.hak,
  yue: i18nModule.yue,
} as const;

type TranslationRoot = TranslationSchema["translation"];

export const normalizeLanguage = (value?: string): Language => {
  if (!value) return "zh-CN";
  const lower = value.toLowerCase();
  // Cantonese
  if (
    lower === "yue" ||
    lower.startsWith("zh-yue") ||
    lower === "zh-hk" ||
    lower === "zh-mo"
  )
    return "yue";
  // Traditional Chinese
  if (lower === "zh-tw" || lower.startsWith("zh-hant")) return "zh-TW";
  // Japanese
  if (lower.startsWith("ja")) return "ja-JP";
  // German
  if (lower.startsWith("de")) return "de-DE";
  // Other regional Chinese variants
  if (lower === "lzh") return "lzh";
  if (lower === "wuu") return "wuu";
  if (lower === "hak") return "hak";
  // English
  if (lower.startsWith("en")) return "en-US";
  // Simplified Chinese (default for zh*)
  if (lower.startsWith("zh")) return "zh-CN";
  return "zh-CN";
};

const getByPath = (root: TranslationRoot, path: string): unknown => {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (!acc || typeof acc !== "object") return undefined;
    if (!(key in acc)) return undefined;
    return (acc as Record<string, unknown>)[key];
  }, root);
};

export const t = (language: Language, key: string): string => {
  const root =
    resources[language]?.translation ?? resources["zh-CN"].translation;
  const value = getByPath(root, key);
  return typeof value === "string" ? value : key;
};

export const getMessage = (
  language: Language,
  key: string,
  fallback?: string,
): string => {
  const value = t(language, key);
  if (value === key && fallback) return fallback;
  return value;
};
