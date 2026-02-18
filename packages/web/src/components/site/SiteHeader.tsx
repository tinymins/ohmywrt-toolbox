import type { User } from "@acme/types";
import { BulbOutlined, GlobalOutlined } from "@ant-design/icons";
import { Button, Dropdown } from "antd";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import type { Lang, LangMode, ThemeMode } from "../../lib/types";
import { LANG_NAMES as LangNames } from "../../lib/types";
import { SystemSettingsModal, UserMenu, UserSettingsModal } from "../account";

type SiteHeaderProps = {
  user: User | null;
  theme: "light" | "dark";
  themeMode: ThemeMode;
  lang: Lang;
  langMode: LangMode;
  onUpdateUser: (user: User) => void;
  onLogout: () => void;
  onChangeLangMode: (mode: LangMode) => void;
  onChangeThemeMode: (mode: ThemeMode) => void;
};

export default function SiteHeader({
  user,
  theme,
  lang,
  langMode,
  onUpdateUser,
  onLogout,
  onChangeLangMode,
  onChangeThemeMode,
  themeMode,
}: SiteHeaderProps) {
  const { t } = useTranslation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [systemSettingsOpen, setSystemSettingsOpen] = useState(false);
  const navItems = t("nav.items", { returnObjects: true }) as {
    label: string;
    href: string;
  }[];

  const _langLabel = langMode === "auto" ? t("common.auto") : LangNames[lang];
  const _themeLabel =
    themeMode === "auto"
      ? t("common.auto")
      : theme === "dark"
        ? t("common.dark")
        : t("common.light");

  const langItems = Object.entries(LangNames).map(([key, label]) => ({
    key,
    label,
  }));
  langItems.unshift({ key: "auto", label: t("common.auto") });

  const themeItems = [
    { key: "auto", label: t("common.auto") },
    { key: "light", label: t("common.light") },
    { key: "dark", label: t("common.dark") },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/70">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <span className="h-3 w-3 rounded-full bg-gradient-to-r from-sky-500 to-emerald-400" />
          <div className="text-lg font-semibold">{t("brand")}</div>
        </div>
        <nav className="hidden items-center gap-6 text-sm md:flex">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="relative px-1 py-1 text-slate-600 transition-colors after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:w-full after:origin-left after:scale-x-0 after:bg-sky-500 after:transition-transform hover:text-sky-600 hover:after:scale-x-100 dark:text-slate-300 dark:hover:text-sky-400 dark:after:bg-sky-400"
            >
              {item.label}
            </a>
          ))}
          <Link
            to="/dashboard"
            className="relative px-1 py-1 text-slate-600 transition-colors after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:w-full after:origin-left after:scale-x-0 after:bg-sky-500 after:transition-transform hover:text-sky-600 hover:after:scale-x-100 dark:text-slate-300 dark:hover:text-sky-400 dark:after:bg-sky-400"
          >
            {t("nav.dashboard")}
          </Link>
        </nav>
        <div className="flex items-center gap-3 text-sm">
          <Dropdown
            trigger={["hover"]}
            menu={{
              items: langItems,
              onClick: ({ key }) => onChangeLangMode(key as LangMode),
            }}
          >
            <Button shape="circle" type="text" icon={<GlobalOutlined />} />
          </Dropdown>
          <Dropdown
            trigger={["hover"]}
            menu={{
              items: themeItems,
              onClick: ({ key }) => onChangeThemeMode(key as ThemeMode),
            }}
          >
            <Button shape="circle" type="text" icon={<BulbOutlined />} />
          </Dropdown>
          {user ? (
            <>
              <UserMenu
                user={user}
                onOpenSettings={() => setSettingsOpen(true)}
                onOpenSystemSettings={() => setSystemSettingsOpen(true)}
                onLogout={onLogout}
              />
              <UserSettingsModal
                open={settingsOpen}
                onClose={() => setSettingsOpen(false)}
                user={user}
                langMode={langMode}
                themeMode={themeMode}
                onUpdateUser={onUpdateUser}
                onChangeLangMode={onChangeLangMode}
                onChangeThemeMode={onChangeThemeMode}
              />
              <SystemSettingsModal
                open={systemSettingsOpen}
                onClose={() => setSystemSettingsOpen(false)}
                user={user}
              />
            </>
          ) : (
            <Link className="btn" to="/login">
              {t("nav.login")}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
