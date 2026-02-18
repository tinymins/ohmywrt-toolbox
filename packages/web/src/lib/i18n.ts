import { deDE, enUS, hak, jaJP, lzh, wuu, yue, zhCN, zhTW } from "@acme/i18n";
import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

const resources = {
  "zh-CN": zhCN,
  "zh-TW": zhTW,
  "en-US": enUS,
  "ja-JP": jaJP,
  "de-DE": deDE,
  lzh: lzh,
  wuu: wuu,
  hak: hak,
  yue: yue,
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
    returnObjects: true, // 允许返回对象和数组
  });

export default i18n;
