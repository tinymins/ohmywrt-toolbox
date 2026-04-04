import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import {
  type Lang,
  type LangMode,
  loadLangMode,
  saveLangMode,
} from "@/lib/preferences";

type LangContextValue = {
  lang: Lang;
  langMode: LangMode;
  setLangMode: (mode: LangMode) => void;
};

const LangContext = createContext<LangContextValue>({
  lang: "zh-CN",
  langMode: "auto",
  setLangMode: () => {},
});

const normalizeLang = (value?: string): Lang => {
  if (!value) return "zh-CN";
  const lower = value.toLowerCase();
  if (lower.startsWith("en")) return "en-US";
  if (lower.startsWith("de")) return "de-DE";
  if (lower.startsWith("ja")) return "ja-JP";
  if (lower === "zh-tw" || lower === "zh_tw" || lower === "zh-hant")
    return "zh-TW";
  if (lower.startsWith("zh")) return "zh-CN";
  return "zh-CN";
};

const detectBrowserLang = (): Lang => {
  if (typeof navigator !== "undefined") {
    const browserLang = navigator.languages?.[0] ?? navigator.language;
    return normalizeLang(browserLang);
  }
  return "zh-CN";
};

export function LangProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  // SSR-safe default: "auto" resolves to browser lang on the client.
  const [langMode, setLangModeState] = useState<LangMode>("auto");
  const [mounted, setMounted] = useState(false);

  const i18nRef = useRef(i18n);
  i18nRef.current = i18n;

  // After hydration: cookie → browser auto-detect.
  useEffect(() => {
    const savedMode = loadLangMode(); // LangMode
    const resolvedLang = savedMode === "auto" ? detectBrowserLang() : savedMode;
    setLangModeState(savedMode);
    if (i18nRef.current.language !== resolvedLang) {
      i18nRef.current.changeLanguage(resolvedLang);
    }
    setMounted(true);
  }, []);

  // Apply + persist on mode change.
  useEffect(() => {
    if (!mounted) return;
    saveLangMode(langMode);
    const resolvedLang = langMode === "auto" ? detectBrowserLang() : langMode;
    if (i18nRef.current.language !== resolvedLang) {
      i18nRef.current.changeLanguage(resolvedLang);
    }
  }, [langMode, mounted]);

  const lang: Lang =
    langMode === "auto" ? detectBrowserLang() : (langMode as Lang);

  return (
    <LangContext.Provider
      value={{ lang, langMode, setLangMode: setLangModeState }}
    >
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
