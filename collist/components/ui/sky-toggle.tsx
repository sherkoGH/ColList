"use client";

import { Moon, Sun } from "lucide-react";

import { useLanguage } from "@/context/LanguageContext";
import { useSkyTheme } from "@/context/SkyThemeContext";

/**
 * Day/night switch styled as a strip of sky. Sprint 1 keeps the palette locked
 * to night; the control animates and records the choice for a later sprint.
 */
export function SkyToggle() {
  const { sky, toggleSky } = useSkyTheme();
  const { t } = useLanguage();
  const isDay = sky === "day";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDay}
      aria-label={t("nav.theme")}
      onClick={toggleSky}
      className="group relative h-8 w-15 cursor-pointer overflow-hidden rounded-full border border-slate-700/80 transition-colors duration-500 ease-out hover:border-emerald-accent/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-accent"
    >
      {/* Night sky */}
      <span
        aria-hidden
        className={`absolute inset-0 bg-gradient-to-b from-slate-900 to-slate-950 transition-opacity duration-500 ease-out ${
          isDay ? "opacity-0" : "opacity-100"
        }`}
      />
      {/* Day sky */}
      <span
        aria-hidden
        className={`absolute inset-0 bg-gradient-to-b from-sky-500/70 to-amber-highlight/40 transition-opacity duration-500 ease-out ${
          isDay ? "opacity-100" : "opacity-0"
        }`}
      />
      {/* Stars, visible only at night */}
      <span
        aria-hidden
        className={`absolute inset-0 transition-opacity duration-500 ease-out ${
          isDay ? "opacity-0" : "opacity-100"
        }`}
      >
        <span className="absolute top-2 left-3 h-px w-px rounded-full bg-slate-200 shadow-[0_0_3px_1px_rgba(226,232,240,0.7)]" />
        <span className="absolute top-4.5 left-6 h-px w-px rounded-full bg-slate-300 shadow-[0_0_2px_1px_rgba(203,213,225,0.6)]" />
        <span className="absolute top-2.5 left-8.5 h-px w-px rounded-full bg-slate-200 shadow-[0_0_2px_1px_rgba(226,232,240,0.5)]" />
      </span>

      {/* Travelling celestial body */}
      <span
        aria-hidden
        className={`absolute top-1 left-1 grid h-6 w-6 place-items-center rounded-full transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isDay
            ? "translate-x-7 bg-amber-highlight text-slate-950 shadow-[0_0_12px_2px_rgba(245,158,11,0.55)]"
            : "translate-x-0 bg-slate-200 text-slate-900 shadow-[0_0_10px_2px_rgba(226,232,240,0.35)]"
        }`}
      >
        {isDay ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
      </span>
    </button>
  );
}

export default SkyToggle;
