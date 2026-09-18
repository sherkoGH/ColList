"use client";

import { ArrowRight, CalendarClock, Check, Flag, Gauge, Target } from "lucide-react";
import { useMemo, useState } from "react";

import { useLanguage, type TranslationKey } from "@/context/LanguageContext";
import { useUser } from "@/context/UserContext";
import universities from "@/data/universities.json";
import { calculateCollegeMatches, type University } from "@/lib/matcher";
import {
  generateStrategicRoadmap,
  type ActionItem,
  type Difficulty,
  type Phase,
  type PriorityTier,
} from "@/lib/roadmap";

const TIER_KEY: Record<PriorityTier, TranslationKey> = {
  Crucial: "road.tier.crucial",
  "High Impact": "road.tier.highImpact",
  Recommended: "road.tier.recommended",
};

const TIER_STYLE: Record<PriorityTier, string> = {
  Crucial: "border-amber-highlight/40 bg-amber-highlight/10 text-amber-highlight",
  "High Impact": "border-emerald-accent/40 bg-emerald-accent/10 text-emerald-accent",
  Recommended: "border-slate-700 bg-slate-800/40 text-slate-400",
};

const DIFFICULTY_KEY: Record<Difficulty, TranslationKey> = {
  Low: "road.diff.low",
  Moderate: "road.diff.moderate",
  High: "road.diff.high",
};

export function RoadmapTimeline() {
  const { t, language } = useLanguage();
  const { profile } = useUser();
  const [focusId, setFocusId] = useState<string | null>(null);

  const matches = useMemo(
    () => calculateCollegeMatches(profile, universities as University[]),
    [profile],
  );

  // Rebuilt on every profile change — the reactivity wire for this section.
  const roadmap = useMemo(
    () => generateStrategicRoadmap(profile, matches, { focusUniversityId: focusId }),
    [profile, matches, focusId],
  );

  const topActions = roadmap.actions.slice(0, 4);

  return (
    <section id="roadmap" className="scroll-mt-16 px-6 pb-20">
      <div className="mx-auto max-w-5xl rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-2xl backdrop-blur-2xl sm:p-8">
        <header className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[0.65rem] tracking-[0.2em] text-emerald-accent uppercase">
              {t("road.eyebrow")}
            </p>
            <h2 className="font-display mt-2 text-2xl text-slate-50 sm:text-3xl">
              {t("road.title")}
            </h2>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-slate-400">
              {t("road.subtitle")}
            </p>
            <span className="mt-3 inline-block rounded-full border border-slate-700 bg-slate-800/40 px-3 py-1 text-[0.6rem] tracking-wide text-slate-400 uppercase">
              {t(`road.track.${roadmap.track}` as TranslationKey)}
            </span>
          </div>

          <DeadlineCounter
            days={roadmap.deadline.daysRemaining}
            label={roadmap.deadline.label[language]}
            isoDate={roadmap.deadline.isoDate}
          />
        </header>

        {/* Point A -> Point B -------------------------------------------- */}
        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-950/40 p-5">
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8">
            <ScoreStone label={t("road.pointA")} value={roadmap.pointA} tone="slate" />
            <ArrowRight className="h-5 w-5 shrink-0 text-slate-600" aria-hidden />
            <ScoreStone label={t("road.pointB")} value={roadmap.pointB} tone="emerald" />
          </div>

          <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-accent to-amber-highlight transition-[width] duration-700 ease-out"
              style={{ width: `${Math.max(0, Math.min(100, roadmap.pointB))}%` }}
            />
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <BoostPill value={roadmap.projectedBoost.admissions} caption={t("road.boostAdm")} />
            <BoostPill value={roadmap.projectedBoost.funding} caption={t("road.boostFund")} />
            <span className="text-[0.65rem] tracking-wide text-slate-600 uppercase">
              {t("road.boost")}
            </span>
          </div>
        </div>

        {/* Scope toggle --------------------------------------------------- */}
        <div className="mt-8 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFocusId(null)}
            className={`cursor-pointer rounded-full border px-4 py-1.5 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-accent ${
              focusId === null
                ? "border-emerald-accent/60 bg-emerald-accent/10 text-emerald-accent"
                : "border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
            }`}
          >
            {t("road.scope.global")}
          </button>
          <select
            aria-label={t("road.scope.school")}
            value={focusId ?? ""}
            onChange={(event) => setFocusId(event.target.value || null)}
            className="cursor-pointer rounded-full border border-slate-800 bg-slate-900/60 px-4 py-1.5 text-xs text-slate-300 outline-none transition-colors focus:border-emerald-accent/60"
          >
            <option value="">{t("road.scope.school")}…</option>
            {matches.map((match) => (
              <option key={match.university.id} value={match.university.id}>
                {match.university.name}
              </option>
            ))}
          </select>
          <span className="text-[0.65rem] text-slate-600">{t("road.scopeHint")}</span>
        </div>

        {/* Priority actions ----------------------------------------------- */}
        <section className="mt-8">
          <h3 className="flex items-center gap-2 text-xs tracking-[0.15em] text-slate-500 uppercase">
            <Target className="h-3.5 w-3.5" />
            {t("road.priority")}
          </h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {topActions.map((action) => (
              <ActionCard key={action.id} action={action} />
            ))}
          </div>
        </section>

        {/* Phases + milestones -------------------------------------------- */}
        <section className="mt-10">
          <h3 className="flex items-center gap-2 text-xs tracking-[0.15em] text-slate-500 uppercase">
            <Flag className="h-3.5 w-3.5" />
            {t("road.phases")}
          </h3>
          <ol className="mt-4 space-y-5">
            {roadmap.phases.map((phase) => (
              <PhaseBlock
                key={phase.id}
                phase={phase}
                milestones={roadmap.milestones.filter((m) => m.phase === phase.id)}
              />
            ))}
          </ol>
        </section>

        <p className="mt-8 text-center text-xs text-slate-600">{t("road.recalcNote")}</p>
      </div>
    </section>
  );
}

function ScoreStone({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "slate" | "emerald";
}) {
  const { t } = useLanguage();
  const colour = tone === "emerald" ? "text-emerald-accent" : "text-slate-300";
  return (
    <div className="text-center">
      <p className="text-[0.6rem] tracking-[0.15em] text-slate-500 uppercase">{label}</p>
      <p className={`font-display mt-1 text-4xl ${colour}`}>{value}</p>
      <p className="text-[0.6rem] text-slate-600">{t("road.index")}</p>
    </div>
  );
}

function BoostPill({ value, caption }: { value: number; caption: string }) {
  const { t } = useLanguage();
  if (value <= 0) {
    return (
      <span className="rounded-full border border-slate-700 bg-slate-800/40 px-3 py-1.5 text-[0.65rem] text-slate-400">
        {t("road.noBoost")} · {caption}
      </span>
    );
  }
  return (
    <span className="animate-fade-in rounded-full border border-emerald-accent/40 bg-emerald-accent/10 px-4 py-1.5 text-sm font-semibold text-emerald-accent">
      +{value}%{" "}
      <span className="text-[0.65rem] font-normal tracking-wide uppercase opacity-80">
        {caption}
      </span>
    </span>
  );
}

function DeadlineCounter({
  days,
  label,
  isoDate,
}: {
  days: number;
  label: string;
  isoDate: string;
}) {
  const { t } = useLanguage();
  const urgent = days <= 60;

  return (
    <div
      className={`shrink-0 rounded-xl border p-4 text-center ${
        urgent
          ? "border-amber-highlight/40 bg-amber-highlight/10"
          : "border-slate-800 bg-slate-950/40"
      }`}
    >
      <p className="flex items-center justify-center gap-1.5 text-[0.6rem] tracking-[0.15em] text-slate-500 uppercase">
        <CalendarClock className="h-3 w-3" />
        {t("road.deadline")}
      </p>
      <p
        className={`font-display mt-1 text-3xl ${urgent ? "text-amber-highlight" : "text-slate-200"}`}
      >
        {days}
      </p>
      <p className="text-[0.6rem] text-slate-500">{days > 0 ? t("road.daysLeft") : t("road.today")}</p>
      <p className="mt-2 text-xs text-slate-400">{label}</p>
      <p className="text-[0.6rem] text-slate-600">{isoDate}</p>
      <span className="mt-2 inline-block rounded-full border border-amber-highlight/30 bg-amber-highlight/10 px-2 py-0.5 text-[0.55rem] font-semibold tracking-wide text-amber-highlight uppercase">
        {t("road.demoData")}
      </span>
    </div>
  );
}

function ActionCard({ action }: { action: ActionItem }) {
  const { t, language } = useLanguage();
  const impact = action.admissionsBoost + action.fundingBoost;

  return (
    <article className="flex flex-col rounded-xl border border-slate-800 bg-slate-950/40 p-5 transition-all hover:border-emerald-500/40">
      <header className="flex items-start justify-between gap-3">
        <h4 className="font-display text-base leading-snug text-slate-50">
          {action.title[language]}
        </h4>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-[0.55rem] font-semibold tracking-wide uppercase ${TIER_STYLE[action.tier]}`}
        >
          {t(TIER_KEY[action.tier])}
        </span>
      </header>

      <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-400">
        {action.detail[language]}
      </p>

      <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-800/80 pt-3 text-center">
        <div>
          <dt className="text-[0.55rem] tracking-wide text-slate-600 uppercase">
            {t("road.timeframe")}
          </dt>
          <dd className="text-xs text-slate-300">
            {action.weeks} {t("road.weeks")}
          </dd>
        </div>
        <div>
          <dt className="text-[0.55rem] tracking-wide text-slate-600 uppercase">
            {t("road.difficulty")}
          </dt>
          <dd className="text-xs text-slate-300">{t(DIFFICULTY_KEY[action.difficulty])}</dd>
        </div>
        <div>
          <dt className="flex items-center justify-center gap-1 text-[0.55rem] tracking-wide text-slate-600 uppercase">
            <Gauge className="h-2.5 w-2.5" />
            {t("road.boost")}
          </dt>
          <dd
            className={`text-xs font-semibold ${impact > 0 ? "text-emerald-accent" : "text-slate-500"}`}
          >
            {impact > 0 ? `+${impact}%` : "—"}
          </dd>
        </div>
      </dl>
    </article>
  );
}

function PhaseBlock({
  phase,
  milestones,
}: {
  phase: Phase;
  milestones: { id: string; label: { en: string; ru: string }; window: { en: string; ru: string } }[];
}) {
  const { t, language } = useLanguage();

  return (
    <li className="relative rounded-xl border border-slate-800 bg-slate-950/40 p-5 pl-6">
      <span
        aria-hidden
        className="absolute top-5 bottom-5 left-0 w-0.5 rounded-full bg-gradient-to-b from-emerald-accent/70 to-transparent"
      />
      <h4 className="font-display text-base text-slate-100">{phase.title[language]}</h4>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">{phase.summary[language]}</p>

      {phase.items.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {phase.items.map((item) => (
            <li key={item.id} className="flex items-start gap-2.5 text-sm text-slate-300">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-accent" />
              {item.title[language]}
            </li>
          ))}
        </ul>
      ) : (
        // Never a blank panel: an empty phase means the student already clears it.
        <p className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-accent/20 bg-emerald-accent/5 px-3 py-2 text-xs text-emerald-accent">
          <Check className="h-3.5 w-3.5 shrink-0" />
          {t("road.cleared")}
        </p>
      )}

      {milestones.length > 0 && (
        <div className="mt-4 border-t border-slate-800/80 pt-3">
          <p className="mb-2 text-[0.55rem] tracking-[0.15em] text-slate-600 uppercase">
            {t("road.milestones")}
          </p>
          <ul className="grid gap-1.5">
            {milestones.map((milestone) => (
              <li
                key={milestone.id}
                className="flex items-baseline justify-between gap-3 text-xs text-slate-500"
              >
                <span>{milestone.label[language]}</span>
                <span className="shrink-0 text-slate-600">{milestone.window[language]}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}

export default RoadmapTimeline;
