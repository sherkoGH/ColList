"use client";

import { ClipboardCopy, Download, Printer, Upload, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { useLanguage, type TranslationKey } from "@/context/LanguageContext";
import { useUser } from "@/context/UserContext";
import universities from "@/data/universities.json";
import { calculateProfileDiagnostic } from "@/lib/diagnostic";
import {
  buildAdvisorSummary,
  copyToClipboard,
  downloadTextFile,
  exportLabels,
  parseProfileBackup,
  serializeProfileBackup,
} from "@/lib/export";
import { calculateCollegeMatches, type University } from "@/lib/matcher";
import { generateStrategicRoadmap } from "@/lib/roadmap";

type Tab = "report" | "data" | "share";
const EXIT_MS = 180;

export function ExportSummaryModal({ onClose }: { onClose: () => void }) {
  const { t, language } = useLanguage();
  const { profile, updateProfile } = useUser();
  const [tab, setTab] = useState<Tab>("report");
  const [notice, setNotice] = useState<{ key: TranslationKey; tone: "ok" | "bad" } | null>(null);
  const [closing, setClosing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const diagnostic = useMemo(() => calculateProfileDiagnostic(profile), [profile]);
  const matches = useMemo(
    () => calculateCollegeMatches(profile, universities as University[]),
    [profile],
  );
  const roadmap = useMemo(
    () => generateStrategicRoadmap(profile, matches),
    [profile, matches],
  );
  const summaryText = useMemo(
    () => buildAdvisorSummary(profile, diagnostic, matches, roadmap, language),
    [profile, diagnostic, matches, roadmap, language],
  );

  function requestClose() {
    setClosing(true);
    window.setTimeout(onClose, EXIT_MS);
  }

  async function handleImport(file: File) {
    const text = await file.text();
    const result = parseProfileBackup(text);
    if (!result.ok) {
      setNotice({
        key: result.reason === "invalid-json" ? "exp.importBadJson" : "exp.importFailed",
        tone: "bad",
      });
      return;
    }
    updateProfile(result.profile);
    setNotice({ key: result.migrated ? "exp.importMigrated" : "exp.imported", tone: "ok" });
  }

  async function handleCopy() {
    const ok = await copyToClipboard(summaryText);
    setNotice({ key: ok ? "exp.copied" : "exp.copyFailed", tone: ok ? "ok" : "bad" });
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
        aria-label={t("exp.title")}
        className="my-auto w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-950/90 shadow-2xl backdrop-blur-2xl"
      >
        <header className="no-print flex items-start justify-between gap-4 border-b border-slate-800/80 p-6">
          <div>
            <h2 className="font-display text-xl text-slate-50">{t("exp.title")}</h2>
            <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-slate-400">
              {t("exp.subtitle")}
            </p>
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

        <div className="no-print flex gap-1.5 border-b border-slate-800/80 px-6 pt-4">
          {(["report", "data", "share"] as Tab[]).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setTab(id);
                setNotice(null);
              }}
              className={`cursor-pointer rounded-t-lg border-b-2 px-4 py-2 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-accent ${
                tab === id
                  ? "border-emerald-accent text-emerald-accent"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
            >
              {t(`exp.tab.${id}` as TranslationKey)}
            </button>
          ))}
        </div>

        <div className="p-6">
          {notice && (
            <p
              className={`no-print mb-4 rounded-lg border px-4 py-2.5 text-xs ${
                notice.tone === "ok"
                  ? "border-emerald-accent/30 bg-emerald-accent/10 text-emerald-accent"
                  : "border-amber-highlight/30 bg-amber-highlight/10 text-amber-highlight"
              }`}
            >
              {t(notice.key)}
            </p>
          )}

          {tab === "report" && (
            <>
              <div className="no-print mb-5 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex cursor-pointer items-center gap-2 rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 transition-colors hover:bg-emerald-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-accent"
                >
                  <Printer className="h-4 w-4" />
                  {t("exp.print")}
                </button>
                <span className="text-xs text-slate-500">{t("exp.printHint")}</span>
              </div>

              <div className="max-h-[50vh] overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/50 p-5">
                <StrategyReport />
              </div>
            </>
          )}

          {tab === "data" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-5">
                <button
                  type="button"
                  onClick={() =>
                    downloadTextFile(
                      `collist-profile-${new Date().toISOString().slice(0, 10)}.json`,
                      serializeProfileBackup(profile),
                    )
                  }
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-emerald-accent/40 bg-emerald-accent/10 px-4 py-2.5 text-sm font-medium text-emerald-accent transition-colors hover:bg-emerald-accent/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-accent"
                >
                  <Download className="h-4 w-4" />
                  {t("exp.download")}
                </button>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-5">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-700 px-4 py-2.5 text-sm text-slate-300 transition-colors hover:border-emerald-accent/60 hover:text-emerald-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-accent"
                >
                  <Upload className="h-4 w-4" />
                  {t("exp.import")}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void handleImport(file);
                    event.target.value = "";
                  }}
                />
                <p className="mt-3 text-xs leading-relaxed text-slate-500">
                  {t("exp.importHint")}
                </p>
              </div>
            </div>
          )}

          {tab === "share" && (
            <div>
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => void handleCopy()}
                  className="flex cursor-pointer items-center gap-2 rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-accent"
                >
                  <ClipboardCopy className="h-4 w-4" />
                  {t("exp.copy")}
                </button>
                <span className="text-xs text-slate-500">{t("exp.shareHint")}</span>
              </div>
              <pre className="max-h-[45vh] overflow-auto rounded-xl border border-slate-800 bg-slate-950/60 p-4 font-mono text-[0.7rem] leading-relaxed whitespace-pre-wrap text-slate-300">
                {summaryText}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * The printable report. Rendered inside the modal for preview and promoted to
 * the whole page by the print stylesheet via `data-print-root`.
 */
function StrategyReport() {
  const { profile } = useUser();
  const { language } = useLanguage();
  const L = exportLabels(language);

  const diagnostic = useMemo(() => calculateProfileDiagnostic(profile), [profile]);
  const matches = useMemo(
    () => calculateCollegeMatches(profile, universities as University[]),
    [profile],
  );
  const roadmap = useMemo(() => generateStrategicRoadmap(profile, matches), [profile, matches]);

  const gpaText =
    profile.gpaScale === 5
      ? `${profile.gpaRaw.toFixed(2)} / 5.0 (${diagnostic.normalizedGpa.toFixed(2)} / 4.0)`
      : `${diagnostic.normalizedGpa.toFixed(2)} / 4.0`;

  return (
    <div data-print-root className="text-sm text-slate-300">
      <header className="print-rule border-b border-slate-800 pb-3">
        <h1 className="font-display text-lg text-slate-100">{L.title}</h1>
        <p className="mt-1 text-xs text-slate-500">
          {L.generated}: {new Date().toLocaleDateString(language === "ru" ? "ru-RU" : "en-GB")}
        </p>
      </header>

      <section className="mt-5">
        <h2 className="font-display text-base text-slate-100">{L.profile}</h2>
        <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-xs sm:grid-cols-3">
          <Row label={L.grade} value={profile.gradeLevel} />
          <Row label={L.gpa} value={gpaText} />
          <Row
            label={L.testing}
            value={
              [
                profile.satStatus === "taken" && profile.satScore ? `SAT ${profile.satScore}` : null,
                profile.satStatus === "optional" ? L.testOptional : null,
                profile.englishStatus === "taken" && profile.englishScore
                  ? `${profile.englishTest} ${profile.englishScore}`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ") || L.notSubmitted
            }
          />
          <Row label={L.activities} value={String(diagnostic.activityCount)} />
          <Row label={L.honors} value={String(diagnostic.honorCount)} />
          <Row label={L.major} value={profile.majorInterest || L.undecided} />
          <Row
            label={L.regions}
            value={profile.preferredRegions.length ? profile.preferredRegions.join(", ") : L.anywhere}
          />
        </dl>

        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-xs sm:grid-cols-3">
          <Row label={L.academic} value={`${diagnostic.academicFitnessScore}/100`} />
          <Row label={L.testReadiness} value={`${diagnostic.testingReadinessScore}/100`} />
          <Row label={L.ecImpact} value={`${diagnostic.ecImpactScore}/100`} />
          <Row label={L.aidIndex} value={`${diagnostic.fullAidIndex}/100`} />
          <Row label={L.startingIndex} value={`${diagnostic.startingPointIndex}/100`} />
        </dl>
      </section>

      <section className="mt-6">
        <h2 className="font-display text-base text-slate-100">{L.matrix}</h2>
        <table className="mt-2 w-full border-collapse text-xs">
          <thead>
            <tr className="print-rule border-b border-slate-800 text-left text-slate-500">
              <th className="py-1.5 pr-3 font-normal">{L.category}</th>
              <th className="py-1.5 pr-3 font-normal">{L.aidType}</th>
              <th className="py-1.5 pr-3 text-right font-normal">{L.admissions}</th>
              <th className="py-1.5 text-right font-normal">{L.funding}</th>
            </tr>
          </thead>
          <tbody>
            {matches.map((match) => (
              <tr key={match.university.id} className="border-b border-slate-800/50">
                <td className="py-1.5 pr-3">
                  <span className="text-slate-200">{match.university.name}</span>
                  <span className="ml-2 text-slate-500">{match.category}</span>
                </td>
                <td className="py-1.5 pr-3 text-slate-400">{match.university.fundingType}</td>
                <td className="py-1.5 pr-3 text-right">{match.admissionsOdds}%</td>
                <td className="py-1.5 text-right">{match.fundingOdds}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-6">
        <h2 className="font-display text-base text-slate-100">{L.roadmap}</h2>
        <p className="mt-1 text-xs text-slate-500">
          {L.deadline}: {roadmap.deadline.label[language]} — {roadmap.deadline.isoDate} (
          {roadmap.deadline.daysRemaining} {L.daysLeft}) · {L.projected}: +
          {roadmap.projectedBoost.admissions}% {L.admissions} / +{roadmap.projectedBoost.funding}%{" "}
          {L.funding}
        </p>
        <ol className="mt-2 space-y-2">
          {roadmap.actions.slice(0, 5).map((action, index) => (
            <li key={action.id} className="text-xs">
              <p className="text-slate-200">
                {index + 1}. [{action.tier}] {action.title[language]}{" "}
                <span className="text-slate-500">
                  ({action.weeks} {L.weeks})
                </span>
              </p>
              <p className="mt-0.5 leading-relaxed text-slate-400">{action.detail[language]}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-6">
        <h2 className="font-display text-base text-slate-100">{L.phases}</h2>
        <ul className="mt-2 space-y-1 text-xs">
          {roadmap.milestones.map((milestone) => (
            <li key={milestone.id} className="flex justify-between gap-4">
              <span className="text-slate-300">{milestone.label[language]}</span>
              <span className="text-slate-500">{milestone.window[language]}</span>
            </li>
          ))}
        </ul>
      </section>

      <p className="print-rule mt-6 border-t border-slate-800 pt-3 text-[0.65rem] leading-relaxed text-slate-500">
        {L.disclaimer}
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 sm:block">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-slate-200">{value}</dd>
    </div>
  );
}

export default ExportSummaryModal;
