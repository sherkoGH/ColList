"use client";

import { Check, ChevronDown, Globe } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  LANGUAGES,
  LANGUAGE_LABELS,
  useLanguage,
  type Language,
} from "@/context/LanguageContext";

/** English and Russian only — ColList supports no other locale. */
export function LanguageSelectorDropdown() {
  const { language, setLanguage, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function choose(next: Language) {
    setLanguage(next);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("nav.language")}
        onClick={() => setOpen((value) => !value)}
        className="flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-700/80 px-3 py-1.5 text-xs font-medium tracking-wide text-slate-300 transition-colors duration-200 hover:border-emerald-accent/50 hover:text-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-accent"
      >
        <Globe className="h-3.5 w-3.5 text-emerald-accent" />
        {LANGUAGE_LABELS[language].code}
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={t("nav.language")}
          className="absolute right-0 z-50 mt-2 w-44 animate-fade-in overflow-hidden rounded-xl border border-slate-800/80 bg-navy-academic/95 p-1 shadow-2xl shadow-slate-950/60 backdrop-blur-xl"
        >
          {LANGUAGES.map((code) => {
            const selected = code === language;
            return (
              <li key={code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => choose(code)}
                  className={`flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors duration-150 ${
                    selected
                      ? "bg-emerald-accent/10 text-emerald-accent"
                      : "text-slate-300 hover:bg-slate-800/70 hover:text-slate-100"
                  }`}
                >
                  <span className="flex items-baseline gap-2">
                    <span className="text-[0.7rem] font-semibold tracking-widest text-slate-500">
                      {LANGUAGE_LABELS[code].code}
                    </span>
                    {LANGUAGE_LABELS[code].native}
                  </span>
                  {selected && <Check className="h-4 w-4" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default LanguageSelectorDropdown;
