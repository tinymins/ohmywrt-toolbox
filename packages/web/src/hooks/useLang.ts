import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { loadLangMode, saveLangMode } from "../lib/storage";
import type { Lang, LangMode } from "../lib/types";
import { LANG_NAMES } from "../lib/types";

// All valid language codes (BCP 47)
const VALID_LANGS = Object.keys(LANG_NAMES) as Lang[];

export function useLang() {
  const { i18n } = useTranslation();
  const [langMode, setLangMode] = useState<LangMode>(() => loadLangMode());

  const normalizeLang = useCallback((value?: string): Lang => {
    const lowerVal = value?.toLowerCase() ?? "";

    // Exact match first (for full BCP 47 codes)
    if (VALID_LANGS.includes(value as Lang)) {
      return value as Lang;
    }

    // Cantonese (yue): yue, zh-yue, zh-hk, zh-mo
    if (
      lowerVal === "yue" ||
      lowerVal.startsWith("zh-yue") ||
      lowerVal === "zh-hk" ||
      lowerVal === "zh-mo"
    ) {
      return "yue";
    }
    // Traditional Chinese (zh-TW): zh-tw, zh-hant
    if (lowerVal === "zh-tw" || lowerVal.startsWith("zh-hant")) {
      return "zh-TW";
    }
    // Japanese (ja-JP)
    if (lowerVal.startsWith("ja")) {
      return "ja-JP";
    }
    // German (de-DE)
    if (lowerVal.startsWith("de")) {
      return "de-DE";
    }
    // English (en-US)
    if (lowerVal.startsWith("en")) {
      return "en-US";
    }
    // Simplified Chinese (zh-CN): zh, zh-cn, zh-hans, zh-sg
    if (lowerVal.startsWith("zh")) {
      return "zh-CN";
    }
    // Default to English
    return "en-US";
  }, []);

  const detectAutoLang = useCallback((): Lang => {
    if (typeof navigator !== "undefined") {
      const browserLang = navigator.languages?.[0] ?? navigator.language;
      return normalizeLang(browserLang);
    }
    if (typeof document !== "undefined") {
      return normalizeLang(document.documentElement.lang);
    }
    return "en-US";
  }, [normalizeLang]);

  const lang: Lang = langMode === "auto" ? detectAutoLang() : langMode;

  useEffect(() => {
    saveLangMode(langMode);
    const nextLang = langMode === "auto" ? detectAutoLang() : langMode;
    if (i18n.language !== nextLang) {
      i18n.changeLanguage(nextLang);
    }
  }, [langMode, i18n, detectAutoLang]);

  return { lang, langMode, setLangMode };
}
