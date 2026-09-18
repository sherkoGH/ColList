"use client";

import { MapPin, ShieldCheck, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

import CollegeDetailDrawer, { FUNDING_LABEL } from "@/components/CollegeDetailDrawer";
import VibeCheckModal from "@/components/VibeCheckModal";
import { useLanguage, type TranslationKey } from "@/context/LanguageContext";
import { useUser } from "@/context/UserContext";
import {
  calculateCollegeMatches,
  type CollegeMatch,
  type MatchCategory,
  type University,
} from "@/lib/matcher";
import { getMatchableUniversities } from "@/lib/universe";

const CATEGORY_STYLE: Record<MatchCategory, string> = {
  Dream: "border-amber-highlight/40 bg-amber-highlight/10 text-amber-highlight",
  Target: "border-emerald-accent/40 bg-emerald-accent/10 text-emerald-accent",
  Safety: "border-sky-400/40 bg-sky-400/10 text-sky-300",
};

export function MatchMatrix() {
  const { t } = useLanguage();
  const { profile } = useUser();
  const [inspecting, setInspecting] = useState<CollegeMatch | null>(null);
  const [vibeFor, setVibeFor] = useState<University | null>(null);

  // Rebuilt whenever the profile changes — this is the reactivity wire.
  const matches = useMemo(
    () => calculateCollegeMatches(profile, getMatchableUniversities()),
    [profile],
  );

  return (
    <section id="matches" className="scroll-mt-16 px-6 pb-20">
      <div className="mx-auto max-w-7xl">
        <header className="mx-auto max-w-2xl text-center">
          <p className="text-[0.65rem] tracking-[0.2em] text-emerald-accent uppercase">
            {t("match.eyebrow")}
          </p>
          <h2 className="font-display mt-2 text-2xl text-slate-50 sm:text-3xl">
            {t("match.title")}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">{t("match.subtitle")}</p>
        </header>

        <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {matches.map((match) => (
            <MatchCard
              key={match.university.id}
              match={match}
              onInspect={setInspecting}
              onVibeCheck={setVibeFor}
            />
          ))}
        </div>

        <p className="mt-6 text-center text-xs text-slate-600">{t("match.recalcNote")}</p>
      </div>

      {inspecting && (
        <CollegeDetailDrawer
          match={inspecting}
          onClose={() => setInspecting(null)}
          onVibeCheck={setVibeFor}
        />
      )}
      {vibeFor && <VibeCheckModal university={vibeFor} onClose={() => setVibeFor(null)} />}
    </section>
  );
}

function MatchCard({
  match,
  onInspect,
  onVibeCheck,
}: {
  match: CollegeMatch;
  onInspect: (match: CollegeMatch) => void;
  onVibeCheck: (university: University) => void;
}) {
  const { t } = useLanguage();
  const { university } = match;

  return (
    <article className="flex flex-col rounded-xl border border-slate-800 bg-slate-900/50 p-5 backdrop-blur-xl transition-all hover:border-emerald-500/40">
      <header>
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-base leading-snug text-slate-50">{university.name}</h3>
          <span
            className={`shrink-0 rounded-full border px-2 py-0.5 text-[0.6rem] font-semibold tracking-wide uppercase ${CATEGORY_STYLE[match.category]}`}
          >
            {t(`match.cat.${match.category}` as TranslationKey)}
          </span>
        </div>

        <p className="mt-1.5 flex items-center gap-1.5 text-[0.7rem] text-slate-500">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">{university.location}</span>
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800/40 px-2 py-0.5 text-[0.55rem] tracking-wide text-slate-400 uppercase">
            <ShieldCheck className="h-2.5 w-2.5" />
            {university.cdsVerifiedTag}
          </span>
          {match.regionBoosted && (
            <span className="rounded-full border border-sky-400/30 bg-sky-400/10 px-2 py-0.5 text-[0.55rem] tracking-wide text-sky-300 uppercase">
              {t("match.regionBoosted")}
            </span>
          )}
        </div>
      </header>

      <div className="mt-5 space-y-3">
        <OddsBar label={t("match.admissions")} value={match.admissionsOdds} tone="emerald" />
        <OddsBar label={t("match.funding")} value={match.fundingOdds} tone="amber" />
      </div>

      <p className="mt-4 rounded-lg border border-emerald-accent/20 bg-emerald-accent/5 px-2.5 py-1.5 text-center text-[0.6rem] font-semibold tracking-wide text-emerald-accent uppercase">
        {t(FUNDING_LABEL[university.fundingType])}
      </p>

      <div className="mt-4 grid gap-2">
        <button
          type="button"
          onClick={() => onVibeCheck(university)}
          className="group/vibe flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-emerald-accent/40 bg-emerald-accent/10 px-3 py-2 text-xs font-medium text-emerald-accent transition-all hover:bg-emerald-accent/20 hover:shadow-[0_0_18px_-4px_rgba(16,185,129,0.6)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-accent"
        >
          <Sparkles className="h-3.5 w-3.5 transition-transform group-hover/vibe:scale-110" />
          {t("vibe.button")}
        </button>
        <button
          type="button"
          onClick={() => onInspect(match)}
          className="w-full cursor-pointer rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 transition-colors hover:border-emerald-accent/60 hover:text-emerald-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-accent"
        >
          {t("match.inspect")}
        </button>
      </div>
    </article>
  );
}

function OddsBar({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "emerald" | "amber";
}) {
  const bar = tone === "emerald" ? "bg-emerald-accent" : "bg-amber-highlight";
  const text = tone === "emerald" ? "text-emerald-accent" : "text-amber-highlight";

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[0.65rem] leading-tight text-slate-500">{label}</span>
        <span className={`font-display text-sm ${text}`}>{value}%</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full rounded-full transition-[width] duration-700 ease-out ${bar}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export default MatchMatrix;
