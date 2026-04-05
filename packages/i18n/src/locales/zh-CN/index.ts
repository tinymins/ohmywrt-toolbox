import common from "./common.js";
import dashboard from "./dashboard.js";
import errors from "./errors.js";
import features from "./features.js";
import footer from "./footer.js";
import generalSettings from "./generalSettings.js";
import hero from "./hero.js";
import login from "./login.js";
import nav from "./nav.js";
import network from "./network.js";
import proxy from "./proxy.js";
import systemSettings from "./systemSettings.js";
import testRequirement from "./testRequirement.js";
import todo from "./todo.js";
import userMenu from "./userMenu.js";
import userSettings from "./userSettings.js";
import workspace from "./workspace.js";

export const zhCN = {
  translation: {
    brand: "OhMyWRT Toolbox",
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
    proxy,
    todo,
    testRequirement,
    network,
  },
};

export type TranslationSchema = typeof zhCN;
