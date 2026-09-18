"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { createPersistentStore } from "@/lib/persistent-store";

/**
 * Sprint 1 renders the Deep Slate palette only. The toggle records intent and
 * publishes it as `data-sky` on <html>; the light token set lands in a later
 * sprint, at which point this value starts driving real colour changes.
 */
export type SkyTheme = "night" | "day";

function isSkyTheme(value: unknown): value is SkyTheme {
  return value === "night" || value === "day";
}

const skyStore = createPersistentStore<SkyTheme>("collist.sky", "night", isSkyTheme);

type SkyThemeContextValue = {
  sky: SkyTheme;
  toggleSky: () => void;
};

const SkyThemeContext = createContext<SkyThemeContextValue | null>(null);

export function SkyThemeProvider({ children }: { children: ReactNode }) {
  const sky = useSyncExternalStore(
    skyStore.subscribe,
    skyStore.getSnapshot,
    skyStore.getServerSnapshot,
  );

  useEffect(() => {
    document.documentElement.dataset.sky = sky;
  }, [sky]);

  const toggleSky = useCallback(() => {
    skyStore.set(skyStore.getSnapshot() === "night" ? "day" : "night");
  }, []);

  const value = useMemo(() => ({ sky, toggleSky }), [sky, toggleSky]);

  return <SkyThemeContext.Provider value={value}>{children}</SkyThemeContext.Provider>;
}

export function useSkyTheme() {
  const context = useContext(SkyThemeContext);
  if (!context) {
    throw new Error("useSkyTheme must be used inside <SkyThemeProvider>.");
  }
  return context;
}
