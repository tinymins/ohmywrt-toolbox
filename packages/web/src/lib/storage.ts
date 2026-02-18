import type { User } from "@acme/types";
import type { LangMode, Theme, ThemeMode } from "./types";

const USER_STORAGE_KEY = "user";
const THEME_MODE_COOKIE_KEY = "themeMode";
const LANG_MODE_COOKIE_KEY = "langMode";

export const loadUser = (): User | null => {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as User & {
      avatarUrl?: string | null;
      langMode?: LangMode | null;
      themeMode?: ThemeMode | null;
    };
    if (
      !parsed.settings &&
      (parsed.avatarUrl || parsed.langMode || parsed.themeMode)
    ) {
      parsed.settings = {
        avatarUrl: parsed.avatarUrl ?? undefined,
        langMode: parsed.langMode ?? undefined,
        themeMode: parsed.themeMode ?? undefined,
      };
    }
    return parsed as User;
  } catch {
    return null;
  }
};

export const saveUser = (user: User | null) => {
  if (typeof window === "undefined") return;
  if (!user) {
    window.localStorage.removeItem(USER_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
};

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
  document.cookie = `${name}=${encodeURIComponent(
    value,
  )}; path=/; max-age=31536000; samesite=lax`;
};

export const clearCookieValue = (name: string) => {
  if (typeof document === "undefined") return;
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

  return "auto";
};

export const saveThemeMode = (mode: ThemeMode) => {
  setCookieValue(THEME_MODE_COOKIE_KEY, mode);
};

export const loadLangMode = (): LangMode => {
  const savedMode = getCookieValue(LANG_MODE_COOKIE_KEY);
  // Valid BCP 47 language codes
  const validModes: LangMode[] = [
    "auto",
    "zh-CN",
    "zh-TW",
    "en-US",
    "ja-JP",
    "de-DE",
    "lzh",
    "wuu",
    "hak",
    "yue",
  ];
  if (validModes.includes(savedMode as LangMode)) {
    return savedMode as LangMode;
  }
  // Legacy support: convert old codes
  if (savedMode === "zh") return "zh-CN";
  if (savedMode === "en") return "en-US";
  if (savedMode === "ja") return "ja-JP";
  if (savedMode === "de") return "de-DE";
  return "auto";
};

export const saveLangMode = (mode: LangMode) => {
  setCookieValue(LANG_MODE_COOKIE_KEY, mode);
};
