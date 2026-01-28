import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Lang, LangMode } from "../lib/types";
import { loadLangMode, saveLangMode } from "../lib/storage";

export function useLang() {
  const { i18n } = useTranslation();
  const [langMode, setLangMode] = useState<LangMode>(() => loadLangMode());
  const normalizeLang = (value?: string): Lang =>
    value?.toLowerCase().startsWith("zh") ? "zh" : "en";

  const detectAutoLang = (): Lang => {
    if (typeof navigator !== "undefined") {
      const browserLang = navigator.languages?.[0] ?? navigator.language;
      return normalizeLang(browserLang);
    }
    if (typeof document !== "undefined") {
      return normalizeLang(document.documentElement.lang);
    }
    return "en";
  };

  const detectedLang: Lang = useMemo(
    () => normalizeLang(i18n.language),
    [i18n.language]
  );

  const lang: Lang = langMode === "auto" ? detectAutoLang() : langMode;

  useEffect(() => {
    saveLangMode(langMode);
    const nextLang = langMode === "auto" ? detectAutoLang() : langMode;
    if (i18n.language !== nextLang) {
      i18n.changeLanguage(nextLang);
    }
  }, [langMode, i18n]);

  return { lang, langMode, setLangMode };
}
