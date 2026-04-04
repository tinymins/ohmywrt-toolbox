import type { TranslationSchema } from "../zh-CN/index.js";
import common from "./common.js";
import dashboard from "./dashboard.js";
import errors from "./errors.js";
import features from "./features.js";
import footer from "./footer.js";
import generalSettings from "./generalSettings.js";
import hero from "./hero.js";
import login from "./login.js";
import nav from "./nav.js";
import systemSettings from "./systemSettings.js";
import userMenu from "./userMenu.js";
import userSettings from "./userSettings.js";
import workspace from "./workspace.js";

export const jaJP: TranslationSchema = {
  translation: {
    brand: "AI Stack",
    common,
    errors,
    login,
    userMenu,
    userSettings,
    dashboard,
    workspace,
    systemSettings,
    generalSettings,
    hero,
    nav,
    footer,
    features,
  },
};
