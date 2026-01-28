import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import { zh, en } from "@acme/i18n";

const resources = {
  zh: zh,
  en: en
} as const;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "zh",
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ["cookie", "navigator", "htmlTag"],
      caches: ["cookie"],
      cookieMinutes: 525600
    },
    returnObjects: true // 允许返回对象和数组
  });

export default i18n;
