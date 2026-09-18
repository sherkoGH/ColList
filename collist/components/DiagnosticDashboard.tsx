"use client";

import { ChevronDown, Lightbulb, SlidersHorizontal, TrendingUp, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";

import OnboardingModal from "@/components/OnboardingModal";
import { useLanguage, type TranslationKey } from "@/context/LanguageContext";
import {
  MAX_ACTIVITIES,
  MAX_HONORS,
  useUser,
  type EcTier,
} from "@/context/UserContext";
import { calculateProfileDiagnostic, type Insight, type InsightKind } from "@/lib/diagnostic";

/** Score at or above which a metric reads as emerald rather than amber. */
const STRONG = 75;

const scoreColor = (score: number) =>
  score >= STRONG ? "text-emerald-accent" : "text-amber-highlight";
const scoreStroke = (score: number) => (score >= STRONG ? "#10B981" : "#F59E0B");
const scoreBar = (score: number) =>
  score >= STRONG ? "bg-emerald-accent" : "bg-amber-highlight";

const TIER_LABEL: Record<EcTier, TranslationKey> = {
  "Olympiads/Research": "ob.tier.olympiadsResearch",
  "Leadership/Projects": "ob.tier.leadershipProjects",
  "Community/Varsity": "ob.tier.communityVarsity",
};

const KIND_STYLE: Record<InsightKind, { icon: typeof TrendingUp; className: string; key: TranslationKey }> = {
  strength: { icon: TrendingUp, className: "text-emerald-accent", key: "dash.kind.strength" },
  gap: { icon: TriangleAlert, className: "text-amber-highlight", key: "dash.kind.gap" },
  action: { icon: Lightbulb, className: "text-slate-300", key: "dash.kind.action" },
};

export function DiagnosticDashboard() {
  const { t, language } = useLanguage();
  const { profile } = useUser();
  const [editing, setEditing] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);

  // Recomputed whenever the profile changes, which is what makes every gauge
  // below animate the moment the modal saves.
  const diagnostic = useMemo(() => calculateProfileDiagnostic(profile), [profile]);

  return (
    <section id="diagnostic" className="scroll-mt-16 px-6 py-20">
      <div className="mx-auto max-w-5xl rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-2xl backdrop-blur-2xl sm:p-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center">
          <ScoreGauge score={diagnostic.startingPointIndex} />

          <div className="flex-1">
            <p className="text-[0.65rem] tracking-[0.2em] text-emerald-accent uppercase">
              {t("dash.eyebrow")}
            </p>
            <h2 className="font-display mt-2 text-2xl text-slate-50 sm:text-3xl">
              {t("dash.title")}
            </h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-400">
              {t("dash.subtitle")}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge>{t(`ob.grade.${profile.gradeLevel}` as TranslationKey)}</Badge>
              <Badge>{diagnostic.season[language]}</Badge>
              {diagnostic.testOptionalStrategy && (
                <Badge tone="amber">{t("dash.testOptionalActive")}</Badge>
              )}
              {diagnostic.testingPotentialUnlocked && !diagnostic.testOptionalStrategy && (
                <Badge tone="amber">{t("dash.testingUnlocked")}</Badge>
              )}
            </div>

            <button
              type="button"
              onClick={() => setEditing(true)}
              className="mt-6 flex cursor-pointer items-center gap-2 rounded-full border border-slate-700 px-5 py-2.5 text-sm text-slate-200 transition-all duration-200 hover:border-emerald-accent/60 hover:text-emerald-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-accent"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {t("dash.edit")}
            </button>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label={t("dash.academic")} score={diagnostic.academicFitnessScore}>
            <p className="font-display text-xl text-slate-100">{diagnostic.displayGpa}</p>
          </MetricCard>

          <MetricCard label={t("dash.testing")} score={diagnostic.testingReadinessScore}>
            {diagnostic.testOptionalStrategy ? (
              <p className="text-sm leading-snug text-amber-highlight">
                {t("dash.testOptionalActive")}
              </p>
            ) : (
              <ul className="space-y-0.5 text-sm text-slate-100">
                {profile.satStatus === "taken" && profile.satScore && (
                  <li>SAT {profile.satScore}</li>
                )}
                {profile.englishStatus === "taken" && profile.englishScore && (
                  <li>
                    {profile.englishTest} {profile.englishScore}
                  </li>
                )}
                {diagnostic.testingNeutral && (
                  <li className="text-slate-500">{t("dash.noScores")}</li>
                )}
              </ul>
            )}
          </MetricCard>

          <MetricCard label={t("dash.ecDensity")} score={diagnostic.ecImpactScore}>
            <p className="text-sm text-slate-100">
              {diagnostic.activityCount} / {MAX_ACTIVITIES}{" "}
              <span className="text-slate-500">{t("dash.activities")}</span>
            </p>
            <p className="text-sm text-slate-100">
              {diagnostic.honorCount} / {MAX_HONORS}{" "}
              <span className="text-slate-500">{t("dash.honors")}</span>
            </p>
            <TierBreakdown distribution={diagnostic.tierDistribution} />
          </MetricCard>

          <MetricCard label={t("dash.aid")} score={diagnostic.fullAidIndex}>
            <p className="text-sm leading-snug text-slate-400">
              {diagnostic.fullAidIndex >= STRONG ? t("dash.aidReady") : t("dash.aidBuilding")}
            </p>
          </MetricCard>
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border border-slate-800 bg-slate-950/40">
          <button
            type="button"
            aria-expanded={notesOpen}
            onClick={() => setNotesOpen((open) => !open)}
            className="flex w-full cursor-pointer items-center justify-between gap-3 px-5 py-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-accent"
          >
            <span className="text-sm font-medium text-slate-200">
              {t("dash.notes")}
              <span className="ml-2 text-xs text-slate-500">{diagnostic.insights.length}</span>
            </span>
            <span className="flex items-center gap-2 text-xs text-slate-500">
              {notesOpen ? t("dash.hide") : t("dash.show")}
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${notesOpen ? "rotate-180" : ""}`}
              />
            </span>
          </button>

          {notesOpen && (
            <ul className="animate-fade-in divide-y divide-slate-800/60 border-t border-slate-800/80">
              {diagnostic.insights.map((insight) => (
                <InsightRow key={insight.id} insight={insight} language={language} />
              ))}
            </ul>
          )}
        </div>
      </div>

      {editing && <OnboardingModal onClose={() => setEditing(false)} />}
    </section>
  );
}

function Badge({ children, tone = "slate" }: { children: React.ReactNode; tone?: "slate" | "amber" }) {
  const styles =
    tone === "amber"
      ? "border-amber-highlight/30 bg-amber-highlight/10 text-amber-highlight"
      : "border-slate-700 bg-slate-800/40 text-slate-300";
  return (
    <span className={`rounded-full border px-3 py-1 text-[0.65rem] tracking-wide uppercase ${styles}`}>
      {children}
    </span>
  );
}

/** Animated radial ring. The dash offset transitions, so score changes sweep. */
function ScoreGauge({ score }: { score: number }) {
  const { t } = useLanguage();
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);

  return (
    <div className="relative mx-auto grid h-40 w-40 shrink-0 place-items-center">
      <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90" aria-hidden>
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke="#1E293B"
          strokeWidth="10"
        />
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke={scoreStroke(score)}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset,stroke] duration-700 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`font-display text-4xl ${scoreColor(score)}`}>{score}</span>
        <span className="text-[0.6rem] tracking-[0.15em] text-slate-500 uppercase">
          {t("dash.of100")}
        </span>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  score,
  children,
}: {
  label: string;
  score: number;
  children: React.ReactNode;
}) {
  return (
    <article className="flex flex-col rounded-xl border border-slate-800 bg-slate-950/40 p-4">
      <header className="flex items-baseline justify-between gap-2">
        <h3 className="text-xs tracking-wide text-slate-500 uppercase">{label}</h3>
        <span className={`font-display text-lg ${scoreColor(score)}`}>{score}</span>
      </header>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full rounded-full transition-[width] duration-700 ease-out ${scoreBar(score)}`}
          style={{ width: `${score}%` }}
        />
      </div>

      <div className="mt-3 flex-1 space-y-1">{children}</div>
    </article>
  );
}

function TierBreakdown({ distribution }: { distribution: Record<EcTier, number> }) {
  const { t } = useLanguage();
  const present = (Object.entries(distribution) as [EcTier, number][]).filter(
    ([, count]) => count > 0,
  );

  if (present.length === 0) {
    return <p className="mt-2 text-xs text-slate-600">{t("dash.none")}</p>;
  }

  return (
    <div className="mt-2">
      <p className="text-[0.6rem] tracking-wide text-slate-600 uppercase">{t("dash.tierMix")}</p>
      <ul className="mt-1 flex flex-wrap gap-1">
        {present.map(([tier, count]) => (
          <li
            key={tier}
            className="rounded-full bg-slate-800/60 px-2 py-0.5 text-[0.6rem] text-slate-300"
          >
            {count}× {t(TIER_LABEL[tier])}
          </li>
        ))}
      </ul>
    </div>
  );
}

function InsightRow({ insight, language }: { insight: Insight; language: "en" | "ru" }) {
  const { t } = useLanguage();
  const { icon: Icon, className, key } = KIND_STYLE[insight.kind];

  return (
    <li className="flex gap-3 px-5 py-4">
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${className}`} />
      <div>
        <p className={`text-[0.6rem] tracking-[0.15em] uppercase ${className}`}>{t(key)}</p>
        <p className="mt-1 text-sm leading-relaxed text-slate-300">{insight[language]}</p>
      </div>
    </li>
  );
}

export default DiagnosticDashboard;
