import { enUS, zhCN } from "@acme/i18n";
import Taro from "@tarojs/taro";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  "zh-CN": zhCN,
  "en-US": enUS,
} as const;

const detectLang = (): string => {
  try {
    const stored = Taro.getStorageSync("miniapp_lang_mode");
    if (stored === "zh-CN" || stored === "en-US") return stored;
    const appInfo = Taro.getAppBaseInfo();
    const lang = appInfo.language ?? "zh-CN";
    return lang.toLowerCase().startsWith("zh") ? "zh-CN" : "en-US";
  } catch {
    return "zh-CN";
  }
};

i18n.use(initReactI18next).init({
  resources,
  lng: detectLang(),
  fallbackLng: "zh-CN",
  interpolation: {
    escapeValue: false,
  },
  returnObjects: true,
});

export default i18n;
