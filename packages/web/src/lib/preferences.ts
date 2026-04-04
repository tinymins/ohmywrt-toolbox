import type {
  AccentColor,
  Lang,
  LangMode,
  Theme,
  ThemeMode,
} from "@acme/types";

export type { AccentColor, Lang, LangMode, Theme, ThemeMode };

const THEME_MODE_COOKIE_KEY = "themeMode";
const LANG_MODE_COOKIE_KEY = "langMode";
const ACCENT_COLOR_COOKIE_KEY = "accentColor";

export const getCookieValue = (name: string): string | null => {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=")[1]) : null;
};

export const setCookieValue = (name: string, value: string) => {
  if (typeof document === "undefined") return;
  // biome-ignore lint/suspicious/noDocumentCookie: intentional cookie management utility
  document.cookie = `${name}=${encodeURIComponent(
    value,
  )}; path=/; max-age=31536000; samesite=lax`;
};

export const clearCookieValue = (name: string) => {
  if (typeof document === "undefined") return;
  // biome-ignore lint/suspicious/noDocumentCookie: intentional cookie management utility
  document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
};

export const detectSystemTheme = (): Theme => {
  if (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }
  return "light";
};

export const loadThemeMode = (): ThemeMode => {
  const savedMode = getCookieValue(THEME_MODE_COOKIE_KEY);
  if (savedMode === "auto" || savedMode === "light" || savedMode === "dark") {
    return savedMode;
  }

  const legacy = getCookieValue("theme");
  if (legacy === "light" || legacy === "dark") {
    return legacy;
  }

  return "dark";
};

export const saveThemeMode = (mode: ThemeMode) => {
  setCookieValue(THEME_MODE_COOKIE_KEY, mode);
};

export const loadLangMode = (): LangMode => {
  const savedMode = getCookieValue(LANG_MODE_COOKIE_KEY);
  const validModes: string[] = [
    "auto",
    "zh-CN",
    "en-US",
    "de-DE",
    "ja-JP",
    "zh-TW",
  ];
  if (savedMode && validModes.includes(savedMode)) {
    return savedMode as LangMode;
  }
  return "auto";
};

export const saveLangMode = (mode: LangMode) => {
  setCookieValue(LANG_MODE_COOKIE_KEY, mode);
};

const VALID_ACCENTS = new Set([
  "emerald",
  "amber",
  "rose",
  "violet",
  "blue",
  "cyan",
]);

export const loadAccentColor = (): AccentColor => {
  const saved = getCookieValue(ACCENT_COLOR_COOKIE_KEY);
  if (saved && VALID_ACCENTS.has(saved)) return saved as AccentColor;
  return "emerald";
};

export const saveAccentColor = (color: AccentColor) => {
  setCookieValue(ACCENT_COLOR_COOKIE_KEY, color);
};
