"use client";

import { Check, Minus, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useLanguage, type TranslationKey } from "@/context/LanguageContext";
import type { CollegeMatch, FundingType, University } from "@/lib/matcher";

const EXIT_MS = 200;

export const FUNDING_LABEL: Record<FundingType, TranslationKey> = {
  "100% Need-Blind": "match.fund.needBlind",
  "Full-Ride Merit": "match.fund.merit",
  "Full-Tuition Guaranteed": "match.fund.tuition",
};

const money = (value: number) => `$${value.toLocaleString("en-US")}`;

export function CollegeDetailDrawer({
  match,
  onClose,
  onVibeCheck,
}: {
  match: CollegeMatch;
  onClose: () => void;
  onVibeCheck: (university: University) => void;
}) {
  const { t, language } = useLanguage();
  const [entered, setEntered] = useState(false);
  const [closing, setClosing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const { university, gaps } = match;

  function requestClose() {
    setClosing(true);
    window.setTimeout(onClose, EXIT_MS);
  }

  useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") requestClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  });

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const visible = entered && !closing;

  return (
    <div
      className={`fixed inset-0 z-[70] flex justify-end bg-slate-950/70 backdrop-blur-sm transition-opacity duration-200 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={university.name}
        tabIndex={-1}
        className={`h-full w-full max-w-lg overflow-y-auto border-l border-slate-800 bg-slate-950/95 shadow-2xl backdrop-blur-2xl transition-transform duration-200 ease-out focus:outline-none ${
          visible ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-800/80 bg-slate-950/90 p-6 backdrop-blur-xl">
          <div>
            <h2 className="font-display text-xl text-slate-50">{university.name}</h2>
            <p className="mt-1 text-xs text-slate-500">{university.location}</p>
            <span className="mt-2 inline-block rounded-full border border-emerald-accent/30 bg-emerald-accent/10 px-2.5 py-0.5 text-[0.6rem] font-semibold text-emerald-accent">
              {t(FUNDING_LABEL[university.fundingType])}
            </span>
          </div>
          <button
            type="button"
            onClick={requestClose}
            aria-label={t("match.close")}
            className="cursor-pointer rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-800/60 hover:text-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-8 p-6">
          <button
            type="button"
            onClick={() => onVibeCheck(university)}
            className="group/vibe flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-emerald-accent/40 bg-emerald-accent/10 px-4 py-3 text-sm font-medium text-emerald-accent transition-all hover:bg-emerald-accent/20 hover:shadow-[0_0_24px_-6px_rgba(16,185,129,0.65)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-accent"
          >
            <Sparkles className="h-4 w-4 transition-transform group-hover/vibe:scale-110" />
            {t("vibe.button")}
          </button>

          {/* Cost ------------------------------------------------------------ */}
          <section>
            <h3 className="text-xs tracking-[0.15em] text-slate-500 uppercase">
              {t("match.cost")}
            </h3>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                <p className="text-[0.6rem] tracking-wide text-slate-500 uppercase">
                  {t("match.coa")}
                </p>
                <p className="font-display mt-1 text-xl text-slate-300 line-through decoration-slate-600">
                  {typeof university.coaUsd === "number" ? money(university.coaUsd) : "—"}
                </p>
                <p className="text-[0.65rem] text-slate-600">{t("match.perYear")}</p>
              </div>
              <div className="rounded-xl border border-emerald-accent/30 bg-emerald-accent/10 p-4">
                <p className="text-[0.6rem] tracking-wide text-emerald-accent/80 uppercase">
                  {t("match.netPrice")}
                </p>
                <p className="font-display mt-1 text-xl text-emerald-accent">
                  {money(match.netPriceUsd)}
                </p>
                <p className="text-[0.65rem] text-emerald-accent/70">{t("match.perYear")}</p>
              </div>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">{t("match.coaNote")}</p>
          </section>

          {/* Gap analysis ----------------------------------------------------- */}
          <section>
            <h3 className="text-xs tracking-[0.15em] text-slate-500 uppercase">
              {t("match.gapTitle")}
            </h3>
            <div className="mt-3 overflow-hidden rounded-xl border border-slate-800">
              <div className="grid grid-cols-[1fr_auto_auto] gap-3 border-b border-slate-800/80 bg-slate-900/60 px-4 py-2 text-[0.6rem] tracking-wide text-slate-500 uppercase">
                <span />
                <span className="text-right">{t("match.you")}</span>
                <span className="w-20 text-right">{t("match.benchmark")}</span>
              </div>
              <GapRow
                label={t("match.gpaRow")}
                you={gaps.gpa.you.toFixed(2)}
                benchmark={gaps.gpa.needed === null ? "—" : gaps.gpa.needed.toFixed(2)}
                meets={gaps.gpa.meets}
                neutral={gaps.gpa.needed === null}
              />
              <GapRow
                label={t("match.satRow")}
                you={gaps.sat.neutral ? t("match.neutral") : String(gaps.sat.you)}
                benchmark={gaps.sat.average === null ? "—" : String(gaps.sat.average)}
                meets={gaps.sat.meets}
                neutral={gaps.sat.neutral}
              />
              <GapRow
                label={t("match.englishRow")}
                you={gaps.english.neutral ? t("match.neutral") : gaps.english.you?.toFixed(1) ?? ""}
                benchmark={gaps.english.average.toFixed(1)}
                meets={gaps.english.meets}
                neutral={gaps.english.neutral}
              />
            </div>
          </section>

          {/* Strategic whys --------------------------------------------------- */}
          <section>
            <h3 className="text-xs tracking-[0.15em] text-slate-500 uppercase">
              {t("match.whys")}
            </h3>
            <ul className="mt-3 space-y-3">
              {match.strategicWhys.map((why, index) => (
                <li
                  key={index}
                  className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3 text-sm leading-relaxed text-slate-300"
                >
                  {why[language]}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <p className="text-sm leading-relaxed text-slate-400">
              {university.description[language]}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {university.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-slate-800/60 px-2.5 py-0.5 text-[0.65rem] text-slate-400"
                >
                  {tag}
                </span>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function GapRow({
  label,
  you,
  benchmark,
  meets,
  neutral = false,
}: {
  label: string;
  you: string;
  benchmark: string;
  meets: boolean;
  neutral?: boolean;
}) {
  const { t } = useLanguage();
  const Icon = neutral ? Minus : meets ? Check : X;
  const tone = neutral
    ? "text-slate-500"
    : meets
      ? "text-emerald-accent"
      : "text-amber-highlight";
  // The tick/cross carries the verdict, so name it for screen readers.
  const verdict = neutral ? t("match.neutral") : meets ? t("match.meets") : t("match.below");

  return (
    <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-slate-800/60 px-4 py-3 last:border-b-0">
      <span className="flex items-center gap-2 text-xs text-slate-400">
        <Icon className={`h-3.5 w-3.5 shrink-0 ${tone}`} aria-hidden />
        <span className="sr-only">{verdict}:</span>
        {label}
      </span>
      <span className={`text-right text-sm font-medium ${tone}`}>{you}</span>
      <span className="w-20 text-right text-sm text-slate-500">{benchmark}</span>
    </div>
  );
}

export default CollegeDetailDrawer;
