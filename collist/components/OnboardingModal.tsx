"use client";

import { ArrowLeft, ArrowRight, Globe2, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import ActivityList from "@/components/onboarding/ActivityList";
import HonorList from "@/components/onboarding/HonorList";
import { FieldLabel, SelectInput, TextInput } from "@/components/ui/field";
import OptionCard from "@/components/ui/option-card";
import { useLanguage, type TranslationKey } from "@/context/LanguageContext";
import {
  ENGLISH_TESTS,
  GPA_SCALES,
  GRADE_LEVELS,
  REGIONS,
  TEST_STATUSES,
  normalizeGpa,
  useUser,
  type EnglishTest,
  type GpaScale,
  type TestStatus,
  type UserProfile,
} from "@/context/UserContext";

const TOTAL_STEPS = 5;
const EXIT_MS = 180;

const MAJORS = [
  { id: "cs", labelKey: "ob.major.cs" },
  { id: "engineering", labelKey: "ob.major.engineering" },
  { id: "sciences", labelKey: "ob.major.sciences" },
  { id: "business", labelKey: "ob.major.business" },
  { id: "humanities", labelKey: "ob.major.humanities" },
] as const satisfies readonly { id: string; labelKey: TranslationKey }[];

export function OnboardingModal({ onClose }: { onClose: () => void }) {
  const { t } = useLanguage();
  const { profile, updateProfile } = useUser();

  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [entered, setEntered] = useState(false);
  const [closing, setClosing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Draft lives locally; nothing reaches the profile until the final step, so
  // abandoning the flow leaves stored answers untouched.
  const [draft, setDraft] = useState<UserProfile>(() => ({ ...profile }));

  function patch(update: Partial<UserProfile>) {
    setDraft((current) => ({ ...current, ...update }));
  }

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

  function finish() {
    updateProfile({ ...draft, hasCompletedOnboarding: true });
    setDone(true);
  }

  const visible = entered && !closing;

  return (
    <div
      className={`fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-sm transition-opacity duration-200 ${
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
        aria-label={t("ob.title")}
        tabIndex={-1}
        className={`my-auto w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-950/90 shadow-2xl backdrop-blur-2xl transition-all duration-200 focus:outline-none ${
          visible ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-95 opacity-0"
        }`}
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-800/80 p-6">
          <div>
            <p className="text-[0.65rem] tracking-[0.2em] text-emerald-accent uppercase">
              {t("ob.title")}
            </p>
            {!done && (
              <p className="mt-1.5 text-xs text-slate-500">
                {t("ob.step")} {step + 1} {t("ob.of")} {TOTAL_STEPS}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={requestClose}
            aria-label={t("ob.close")}
            className="cursor-pointer rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-800/60 hover:text-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {!done && (
          <div className="flex gap-1.5 px-6 pt-5" aria-hidden>
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
              <span
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                  i <= step ? "bg-emerald-accent" : "bg-slate-800"
                }`}
              />
            ))}
          </div>
        )}

        <div className="p-6">
          {done ? (
            <Summary draft={draft} />
          ) : (
            <>
              <h2 className="font-display text-xl text-slate-50">
                {t(`ob.s${step + 1}.title` as TranslationKey)}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                {t(`ob.s${step + 1}.subtitle` as TranslationKey)}
              </p>

              <div className="mt-6">
                {step === 0 && (
                  <div role="radiogroup" className="grid gap-2.5">
                    {GRADE_LEVELS.map((grade) => (
                      <OptionCard
                        key={grade}
                        label={t(`ob.grade.${grade}` as TranslationKey)}
                        note={
                          draft.gradeLevel === grade
                            ? t(`ob.grade.${grade}.note` as TranslationKey)
                            : undefined
                        }
                        selected={draft.gradeLevel === grade}
                        onSelect={() => patch({ gradeLevel: grade })}
                      />
                    ))}
                  </div>
                )}

                {step === 1 && <AcademicStep draft={draft} patch={patch} />}

                {step === 2 && (
                  <div className="grid gap-7">
                    <ActivityList
                      activities={draft.activities}
                      onChange={(activities) => patch({ activities })}
                    />
                    <HonorList honors={draft.honors} onChange={(honors) => patch({ honors })} />
                  </div>
                )}

                {step === 3 && <RegionStep draft={draft} patch={patch} />}

                {step === 4 && (
                  <div role="radiogroup" className="grid gap-2.5">
                    {MAJORS.map((major) => (
                      <OptionCard
                        key={major.id}
                        label={t(major.labelKey)}
                        selected={draft.majorInterest === major.id}
                        onSelect={() => patch({ majorInterest: major.id })}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-slate-800/80 p-6">
          {done ? (
            <button
              type="button"
              onClick={requestClose}
              className="ml-auto cursor-pointer rounded-full bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 transition-colors hover:bg-emerald-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-accent"
            >
              {t("ob.done.cta")}
            </button>
          ) : (
            <>
              {step > 0 ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => s - 1)}
                  className="flex cursor-pointer items-center gap-2 rounded-full border border-slate-800 px-5 py-2.5 text-sm text-slate-300 transition-colors hover:border-slate-700 hover:text-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-accent"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  {t("ob.back")}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={requestClose}
                  className="cursor-pointer text-sm text-slate-500 transition-colors hover:text-slate-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-accent"
                >
                  {t("ob.skip")}
                </button>
              )}

              <button
                type="button"
                onClick={() => (step === TOTAL_STEPS - 1 ? finish() : setStep((s) => s + 1))}
                className="flex cursor-pointer items-center gap-2 rounded-full bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 transition-colors hover:bg-emerald-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-accent"
              >
                {step === TOTAL_STEPS - 1 ? t("ob.finish") : t("ob.next")}
                {step === TOTAL_STEPS - 1 ? (
                  <Sparkles className="h-3.5 w-3.5" />
                ) : (
                  <ArrowRight className="h-3.5 w-3.5" />
                )}
              </button>
            </>
          )}
        </footer>
      </div>
    </div>
  );
}

type StepProps = {
  draft: UserProfile;
  patch: (update: Partial<UserProfile>) => void;
};

/** Small segmented control used for GPA scale and test status. */
function Segmented<T extends string | number>({
  options,
  value,
  onSelect,
  label,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onSelect: (next: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onSelect(option.value)}
            className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-accent ${
              selected
                ? "border-emerald-accent/60 bg-emerald-accent/10 text-emerald-accent"
                : "border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function AcademicStep({ draft, patch }: StepProps) {
  const { t } = useLanguage();
  const equivalent = normalizeGpa(draft.gpaRaw, draft.gpaScale);

  function changeScale(scale: GpaScale) {
    // Preserve the letter-grade meaning of the current value across scales
    // instead of stranding a 4.8 on a 4.0 slider.
    const shift = scale === 5 ? draft.gpaRaw + 1 : draft.gpaRaw - 1;
    const next = Math.min(scale, Math.max(0, Number(shift.toFixed(2))));
    patch({ gpaScale: scale, gpaRaw: next, gpa: normalizeGpa(next, scale) });
  }

  return (
    <div className="grid gap-7">
      <div>
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor="gpa" className="text-sm text-slate-300">
            {t("ob.gpa")}
          </label>
          <span className="font-display text-lg text-emerald-accent">
            {draft.gpaRaw.toFixed(2)}
            {draft.gpaScale === 5 && (
              <span className="ml-2 text-xs text-slate-500">
                {equivalent.toFixed(2)} {t("ob.gpaEquiv")}
              </span>
            )}
          </span>
        </div>

        <div className="mt-3">
          <Segmented
            label={t("ob.gpaScale")}
            value={draft.gpaScale}
            onSelect={changeScale}
            options={GPA_SCALES.map((scale) => ({
              value: scale,
              label: scale === 4 ? t("ob.scale4") : t("ob.scale5"),
            }))}
          />
        </div>

        <input
          id="gpa"
          type="range"
          min={0}
          max={draft.gpaScale}
          step={0.01}
          value={draft.gpaRaw}
          onChange={(event) => {
            const raw = Number(event.target.value);
            patch({ gpaRaw: raw, gpa: normalizeGpa(raw, draft.gpaScale) });
          }}
          className="mt-4 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-800 accent-emerald-500"
        />
      </div>

      <div>
        <FieldLabel htmlFor="sat" hint={t("ob.optional")}>
          {t("ob.sat")}
        </FieldLabel>
        <Segmented
          label={t("ob.sat")}
          value={draft.satStatus}
          onSelect={(status: TestStatus) =>
            patch({ satStatus: status, satScore: status === "taken" ? draft.satScore : null })
          }
          options={TEST_STATUSES.map((status) => ({
            value: status,
            label: t(`ob.satStatus.${status}` as TranslationKey),
          }))}
        />
        {draft.satStatus === "taken" && (
          <TextInput
            id="sat"
            type="number"
            inputMode="numeric"
            min={400}
            max={1600}
            step={10}
            value={draft.satScore ?? ""}
            placeholder={t("ob.satPlaceholder")}
            onChange={(event) =>
              patch({ satScore: event.target.value === "" ? null : Number(event.target.value) })
            }
            className="mt-3"
          />
        )}
        {draft.satStatus === "optional" && (
          <p className="mt-2 text-xs leading-relaxed text-amber-highlight/80">
            {t("ob.satOptionalNote")}
          </p>
        )}
        {draft.satStatus === "planned" && (
          <p className="mt-2 text-xs leading-relaxed text-slate-500">{t("ob.satPlannedNote")}</p>
        )}
      </div>

      <div>
        <FieldLabel hint={t("ob.optional")}>{t("ob.english")}</FieldLabel>
        <Segmented
          label={t("ob.english")}
          value={draft.englishStatus}
          onSelect={(status: TestStatus) =>
            patch({
              englishStatus: status,
              englishScore: status === "taken" ? draft.englishScore : null,
            })
          }
          options={TEST_STATUSES.map((status) => ({
            value: status,
            label: t(`ob.engStatus.${status}` as TranslationKey),
          }))}
        />
        {draft.englishStatus === "taken" && (
          <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <SelectInput
              aria-label={t("ob.englishTest")}
              value={draft.englishTest}
              onChange={(event) => patch({ englishTest: event.target.value as EnglishTest })}
            >
              {ENGLISH_TESTS.map((test) => (
                <option key={test} value={test}>
                  {test}
                </option>
              ))}
            </SelectInput>
            <TextInput
              type="number"
              inputMode="decimal"
              min={0}
              max={200}
              step={0.5}
              aria-label={t("ob.scorePlaceholder")}
              value={draft.englishScore ?? ""}
              placeholder={t("ob.scorePlaceholder")}
              onChange={(event) =>
                patch({
                  englishScore: event.target.value === "" ? null : Number(event.target.value),
                })
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}

function RegionStep({ draft, patch }: StepProps) {
  const { t } = useLanguage();
  const anywhere = draft.preferredRegions.length === 0;

  return (
    <div>
      <button
        type="button"
        role="radio"
        aria-checked={anywhere}
        onClick={() => patch({ preferredRegions: [] })}
        className={`flex w-full cursor-pointer items-start gap-3 rounded-xl border p-4 text-left transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-accent ${
          anywhere
            ? "border-emerald-accent/60 bg-emerald-accent/10 shadow-[0_0_24px_-8px_rgba(16,185,129,0.5)]"
            : "border-slate-800 bg-slate-900/50 hover:border-slate-700"
        }`}
      >
        <Globe2
          className={`mt-0.5 h-5 w-5 shrink-0 ${anywhere ? "text-emerald-accent" : "text-slate-500"}`}
        />
        <span className="flex flex-col gap-1">
          <span className={`text-sm font-medium ${anywhere ? "text-slate-50" : "text-slate-200"}`}>
            {t("ob.region.anywhere")}
          </span>
          <span className="text-xs leading-relaxed text-slate-400">
            {t("ob.region.anywhereNote")}
          </span>
        </span>
      </button>

      <div role="group" className="mt-4 grid gap-2.5 sm:grid-cols-2">
        {REGIONS.map((region) => {
          const selected = draft.preferredRegions.includes(region);
          return (
            <OptionCard
              key={region}
              multi
              label={t(`ob.region.${region}` as TranslationKey)}
              selected={selected}
              onSelect={() =>
                patch({
                  preferredRegions: selected
                    ? draft.preferredRegions.filter((r) => r !== region)
                    : [...draft.preferredRegions, region],
                })
              }
            />
          );
        })}
      </div>

      <p className="mt-3 text-xs leading-relaxed text-slate-500">{t("ob.regionHint")}</p>
    </div>
  );
}

function Summary({ draft }: { draft: UserProfile }) {
  const { t } = useLanguage();

  const testing = [
    draft.satStatus === "taken" && draft.satScore ? `SAT ${draft.satScore}` : null,
    draft.satStatus === "optional" ? t("ob.done.testOptional") : null,
    draft.englishStatus === "taken" && draft.englishScore
      ? `${draft.englishTest} ${draft.englishScore}`
      : null,
  ].filter(Boolean);

  const rows: { label: string; value: string }[] = [
    { label: t("ob.done.grade"), value: t(`ob.grade.${draft.gradeLevel}` as TranslationKey) },
    {
      label: t("ob.done.gpa"),
      value:
        draft.gpaScale === 5
          ? `${draft.gpaRaw.toFixed(2)} / 5.0 · ${draft.gpa.toFixed(2)} ${t("ob.gpaEquiv")}`
          : draft.gpa.toFixed(2),
    },
    { label: t("ob.done.testing"), value: testing.join(" · ") || t("ob.notTaken") },
    {
      label: t("ob.done.activities"),
      value: draft.activities.length ? String(draft.activities.length) : t("ob.done.none"),
    },
    {
      label: t("ob.done.honors"),
      value: draft.honors.length ? String(draft.honors.length) : t("ob.done.none"),
    },
    {
      label: t("ob.done.regions"),
      value: draft.preferredRegions.length
        ? draft.preferredRegions
            .map((region) => t(`ob.region.${region}` as TranslationKey))
            .join(" · ")
        : t("ob.done.anyRegion"),
    },
    {
      label: t("ob.done.major"),
      value: draft.majorInterest
        ? t(`ob.major.${draft.majorInterest}` as TranslationKey)
        : t("ob.done.noMajor"),
    },
  ];

  return (
    <div>
      <h2 className="font-display flex items-center gap-2 text-xl text-slate-50">
        <Sparkles className="h-4 w-4 text-emerald-accent" />
        {t("ob.done.title")}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">{t("ob.done.subtitle")}</p>

      <dl className="mt-6 divide-y divide-slate-800/80 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-4 px-4 py-3">
            <dt className="text-xs tracking-wide text-slate-500 uppercase">{row.label}</dt>
            <dd className="text-right text-sm font-medium text-slate-100">{row.value}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-5 rounded-xl border border-emerald-accent/20 bg-emerald-accent/5 px-4 py-3 text-xs leading-relaxed text-emerald-accent/90">
        {t("ob.done.next")}
      </p>
    </div>
  );
}

export default OnboardingModal;
