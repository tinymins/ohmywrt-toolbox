import { useEffect, useState } from "react";
import {
  detectSystemTheme,
  loadThemeMode,
  saveThemeMode,
} from "../lib/storage";
import type { Theme, ThemeMode } from "../lib/types";

export function useTheme() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => loadThemeMode());
  const [theme, setTheme] = useState<Theme>(() =>
    themeMode === "auto" ? detectSystemTheme() : themeMode,
  );

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

  return { theme, themeMode, setThemeMode };
}
