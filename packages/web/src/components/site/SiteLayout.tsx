import type { User } from "@acme/types";
import { Outlet } from "react-router-dom";
import type { Lang, LangMode, Theme, ThemeMode } from "../../lib/types";
import SiteFooter from "./SiteFooter";
import SiteHeader from "./SiteHeader";

type SiteLayoutProps = {
  user: User | null;
  theme: Theme;
  themeMode: ThemeMode;
  lang: Lang;
  langMode: LangMode;
  onUpdateUser: (user: User) => void;
  onLogout: () => void;
  onChangeLangMode: (mode: LangMode) => void;
  onChangeThemeMode: (mode: ThemeMode) => void;
};

export default function SiteLayout({
  user,
  theme,
  themeMode,
  lang,
  langMode,
  onUpdateUser,
  onLogout,
  onChangeLangMode,
  onChangeThemeMode,
}: SiteLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <SiteHeader
        user={user}
        theme={theme}
        themeMode={themeMode}
        lang={lang}
        langMode={langMode}
        onUpdateUser={onUpdateUser}
        onLogout={onLogout}
        onChangeLangMode={onChangeLangMode}
        onChangeThemeMode={onChangeThemeMode}
      />
      <main>
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}
