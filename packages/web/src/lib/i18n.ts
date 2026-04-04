import { deDE, enUS, jaJP, zhCN, zhTW } from "@acme/i18n";
import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

const resources = {
  "zh-CN": zhCN,
  "en-US": enUS,
  "de-DE": deDE,
  "ja-JP": jaJP,
  "zh-TW": zhTW,
} as const;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "zh-CN",
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["cookie", "navigator", "htmlTag"],
      caches: ["cookie"],
      cookieMinutes: 525600,
    },
    returnObjects: true,
  });

export default i18n;
