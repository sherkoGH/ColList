"use client";

import { FileText, GraduationCap, Sparkles, Users, Wallet, X } from "lucide-react";
import { useState } from "react";

import { useLanguage, type TranslationKey } from "@/context/LanguageContext";

const EXIT_MS = 180;

const FEATURES = [
  { id: "essay", icon: FileText },
  { id: "network", icon: Users },
  { id: "aid", icon: Wallet },
  { id: "counselor", icon: GraduationCap },
] as const;

export function ProPreviewModal({ onClose }: { onClose: () => void }) {
  const { t } = useLanguage();
  const [closing, setClosing] = useState(false);

  function requestClose() {
    setClosing(true);
    window.setTimeout(onClose, EXIT_MS);
  }

  return (
    <div
      className={`fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-slate-950/75 p-4 backdrop-blur-sm transition-opacity duration-200 ${
        closing ? "opacity-0" : "opacity-100"
      }`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("pro.title")}
        className="my-auto w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-950/90 p-6 shadow-2xl backdrop-blur-2xl sm:p-8"
      >
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-1.5 text-[0.65rem] tracking-[0.2em] text-amber-highlight uppercase">
              <Sparkles className="h-3 w-3" />
              {t("pro.badge")}
            </p>
            <h2 className="font-display mt-2 text-xl text-slate-50 sm:text-2xl">
              {t("pro.title")}
            </h2>
            <p className="mt-1.5 text-sm text-slate-400">{t("pro.subtitle")}</p>
          </div>
          <button
            type="button"
            onClick={requestClose}
            aria-label={t("exp.close")}
            className="cursor-pointer rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-800/60 hover:text-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <ul className="mt-7 grid gap-4 sm:grid-cols-2">
          {FEATURES.map(({ id, icon: Icon }) => (
            <li
              key={id}
              className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 backdrop-blur-xl"
            >
              <Icon className="h-5 w-5 text-emerald-accent" />
              <h3 className="font-display mt-3 text-base leading-snug text-slate-100">
                {t(`pro.${id}.title` as TranslationKey)}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                {t(`pro.${id}.body` as TranslationKey)}
              </p>
            </li>
          ))}
        </ul>

        {/* Deliberately not a waitlist: there is no backend to collect one, and
            a fake signup form would be the dishonest version of this preview. */}
        <p className="mt-6 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3 text-center text-xs leading-relaxed text-slate-500">
          {t("pro.notifyHint")}
        </p>
      </div>
    </div>
  );
}

export default ProPreviewModal;
