import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import {
  THEMES,
  DEFAULT_THEME_ID,
  DEFAULT_MODE,
  ColorPalette,
  ThemeMode,
  getPalette,
} from "./themes";

type ThemeContextValue = {
  themeId: string;
  mode: ThemeMode;
  colors: ColorPalette;
  setTheme: (id: string) => void;
  setMode: (m: ThemeMode) => void;
  toggleMode: () => void;
  themes: typeof THEMES;
};

const Ctx = createContext<ThemeContextValue | null>(null);

const STORAGE_THEME_KEY = "cs_theme_id";
const STORAGE_MODE_KEY = "cs_theme_mode";

const storage = {
  async getItem(k: string): Promise<string | null> {
    if (Platform.OS === "web") {
      try {
        return globalThis.localStorage?.getItem(k) ?? null;
      } catch {
        return null;
      }
    }
    return await SecureStore.getItemAsync(k);
  },
  async setItem(k: string, v: string): Promise<void> {
    if (Platform.OS === "web") {
      try {
        globalThis.localStorage?.setItem(k, v);
      } catch {}
      return;
    }
    await SecureStore.setItemAsync(k, v);
  },
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeIdState] = useState<string>(DEFAULT_THEME_ID);
  const [mode, setModeState] = useState<ThemeMode>(DEFAULT_MODE);

  useEffect(() => {
    (async () => {
      const t = await storage.getItem(STORAGE_THEME_KEY);
      const m = (await storage.getItem(STORAGE_MODE_KEY)) as ThemeMode | null;
      if (t && THEMES.some((th) => th.id === t)) setThemeIdState(t);
      if (m === "light" || m === "dark") setModeState(m);
    })();
  }, []);

  const setTheme = (id: string) => {
    setThemeIdState(id);
    storage.setItem(STORAGE_THEME_KEY, id);
  };
  const setMode = (m: ThemeMode) => {
    setModeState(m);
    storage.setItem(STORAGE_MODE_KEY, m);
  };
  const toggleMode = () => setMode(mode === "dark" ? "light" : "dark");

  const colors = useMemo(() => getPalette(themeId, mode), [themeId, mode]);

  const value: ThemeContextValue = useMemo(
    () => ({ themeId, mode, colors, setTheme, setMode, toggleMode, themes: THEMES }),
    [themeId, mode, colors]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeContextValue {
  const v = useContext(Ctx);
  if (!v) {
    // Fallback before provider mounts; returns default palette (synth dark)
    return {
      themeId: DEFAULT_THEME_ID,
      mode: DEFAULT_MODE,
      colors: getPalette(DEFAULT_THEME_ID, DEFAULT_MODE),
      setTheme: () => {},
      setMode: () => {},
      toggleMode: () => {},
      themes: THEMES,
    };
  }
  return v;
}
