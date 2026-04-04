import type { AccentColor } from "@acme/types";
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
  loadAccentColor,
  loadThemeMode,
  saveAccentColor,
  saveThemeMode,
  type Theme,
  type ThemeMode,
} from "@/lib/preferences";

type ThemeContextValue = {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  accent: AccentColor;
  setAccent: (color: AccentColor) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  themeMode: "dark",
  setThemeMode: () => {},
  accent: "emerald",
  setAccent: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>("dark");
  const [theme, setTheme] = useState<Theme>("dark");
  const [accent, setAccentState] = useState<AccentColor>("emerald");
  const [mounted, setMounted] = useState(false);

  // After hydration: read from cookies
  useEffect(() => {
    const savedMode = loadThemeMode();
    const resolvedTheme =
      savedMode === "auto" ? detectSystemTheme() : savedMode;
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
    setThemeModeState(savedMode);
    setTheme(resolvedTheme);

    const savedAccent = loadAccentColor();
    setAccentState(savedAccent);
    document.documentElement.setAttribute("data-accent", savedAccent);

    setMounted(true);
  }, []);

  // Apply + persist on mode change
  useEffect(() => {
    if (!mounted) return;
    saveThemeMode(themeMode);
    const resolvedTheme =
      themeMode === "auto" ? detectSystemTheme() : themeMode;
    setTheme(resolvedTheme);
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
  }, [themeMode, mounted]);

  // Apply + persist accent color
  useEffect(() => {
    if (!mounted) return;
    saveAccentColor(accent);
    document.documentElement.setAttribute("data-accent", accent);
  }, [accent, mounted]);

  // System theme listener (only relevant when mode is "auto")
  useEffect(() => {
    if (typeof window === "undefined" || themeMode !== "auto") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      setTheme(media.matches ? "dark" : "light");
      document.documentElement.classList.toggle("dark", media.matches);
    };
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, [themeMode]);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
  }, []);

  const setAccent = useCallback((color: AccentColor) => {
    setAccentState(color);
  }, []);

  return (
    <ThemeContext.Provider
      value={{ theme, themeMode, setThemeMode, accent, setAccent }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
