import type { User } from "@acme/types";
import type { Lang, LangMode, Theme, ThemeMode } from "../../lib/types";

export interface DashboardLayoutProps {
  user: User | null;
  lang: Lang;
  langMode: LangMode;
  theme: Theme;
  themeMode: ThemeMode;
  onUpdateUser: (user: User) => void;
  onLogout: () => void;
  onChangeLangMode: (mode: LangMode) => void;
  onChangeThemeMode: (mode: ThemeMode) => void;
}

export type Workspace = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  ownerId?: string | null;
  createdAt?: string;
};
