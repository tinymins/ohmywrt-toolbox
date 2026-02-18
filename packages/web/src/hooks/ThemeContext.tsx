import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  detectSystemTheme,
  loadThemeMode,
  saveThemeMode,
} from "../lib/storage";
import type { Theme, ThemeMode } from "../lib/types";

interface ThemeContextValue {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() =>
    loadThemeMode(),
  );
  const [theme, setTheme] = useState<Theme>(() =>
    themeMode === "auto" ? detectSystemTheme() : themeMode,
  );

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
  }, []);

  useEffect(() => {
    saveThemeMode(themeMode);
    const resolvedTheme =
      themeMode === "auto" ? detectSystemTheme() : themeMode;
    setTheme(resolvedTheme);

    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle(
        "dark",
        resolvedTheme === "dark",
      );
    }
  }, [themeMode]);

  useEffect(() => {
    if (typeof window === "undefined" || themeMode !== "auto") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      setTheme(media.matches ? "dark" : "light");
      if (typeof document !== "undefined") {
        document.documentElement.classList.toggle("dark", media.matches);
      }
    };
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, [themeMode]);

  return (
    <ThemeContext.Provider value={{ theme, themeMode, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemeContext must be used within a ThemeProvider");
  }
  return context;
}
