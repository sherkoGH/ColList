"use client";

import { Sparkles, Wifi, WifiOff, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useLanguage, type TranslationKey } from "@/context/LanguageContext";
import { useUser } from "@/context/UserContext";
import type { University } from "@/lib/matcher";
import { VIBE_DIMENSIONS, type VibeCheck, type VibeDimension } from "@/lib/qualitativeEvaluator";

const EXIT_MS = 180;

const DIMENSION_LABEL: Record<VibeDimension, TranslationKey> = {
  academicIntensity: "vibe.dim.academicIntensity",
  collaboration: "vibe.dim.collaboration",
  globalPrestige: "vibe.dim.globalPrestige",
  internationalInclusivity: "vibe.dim.internationalInclusivity",
  workLifeBalance: "vibe.dim.workLifeBalance",
};

const FEEDER_LABEL = {
  tech: "vibe.feeder.tech",
  quant: "vibe.feeder.quant",
  gradSchool: "vibe.feeder.gradSchool",
  alumniLeverage: "vibe.feeder.alumniLeverage",
} as const satisfies Record<string, TranslationKey>;

export function VibeCheckModal({
  university,
  onClose,
}: {
  university: University;
  onClose: () => void;
}) {
  const { t, language } = useLanguage();
  const { profile } = useUser();
  const [data, setData] = useState<VibeCheck | null>(null);
  const [failed, setFailed] = useState(false);
  const [entered, setEntered] = useState(false);
  const [closing, setClosing] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  // No synchronous setState here: the first state write happens after the
  // await, so calling this from an effect body does not cascade renders.
  // Fetch on mount and on every retry. State is written inside promise
  // callbacks rather than the effect body, which is the pattern the
  // set-state-in-effect rule is asking for.
  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/vibe-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ universityId: university.id, profile }),
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json() as Promise<VibeCheck>;
      })
      .then((payload) => {
        if (!controller.signal.aborted) setData(payload);
      })
      .catch((error: Error) => {
        // An abort is this component unmounting, not a failure.
        if (error?.name !== "AbortError") setFailed(true);
      });

    return () => controller.abort();
  }, [university.id, profile, attempt]);

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
      className={`fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-slate-950/75 p-4 backdrop-blur-sm transition-opacity duration-200 ${
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
        aria-label={`${t("vibe.title")} — ${university.name}`}
        aria-busy={!data && !failed}
        tabIndex={-1}
        className={`my-auto w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-950/90 p-6 shadow-2xl backdrop-blur-2xl transition-all duration-200 focus:outline-none sm:p-8 ${
          visible ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-95 opacity-0"
        }`}
      >
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-1.5 text-[0.65rem] tracking-[0.2em] text-emerald-accent uppercase">
              <Sparkles className="h-3 w-3" />
              {t("vibe.title")}
            </p>
            <h2 className="font-display mt-2 text-xl text-slate-50 sm:text-2xl">
              {university.name}
            </h2>
            <p className="mt-1 text-xs text-slate-500">{university.location}</p>
          </div>

          <div className="flex items-center gap-3">
            {data && <VibeIndexBadge value={data.vibeMatchIndex} />}
            <button
              type="button"
              onClick={requestClose}
              aria-label={t("vibe.close")}
              className="cursor-pointer rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-800/60 hover:text-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-accent"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        {!data && !failed && <VibeSkeleton label={t("vibe.loading")} />}

        {failed && (
          <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/40 p-6 text-center">
            <p className="text-sm text-slate-300">{t("vibe.error")}</p>
            <button
              type="button"
              onClick={() => {
                setFailed(false);
                setData(null);
                setAttempt((n) => n + 1);
              }}
              className="mt-4 cursor-pointer rounded-full bg-emerald-500 px-5 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-emerald-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-accent"
            >
              {t("vibe.retry")}
            </button>
          </div>
        )}

        {data && (
          <div className="animate-fade-in mt-7 space-y-7">
            <SourceTag source={data.source} />

            <section className="grid gap-6 lg:grid-cols-2">
              <div>
                <h3 className="text-xs tracking-[0.15em] text-slate-500 uppercase">
                  {t("vibe.dimensions")}
                </h3>
                <div className="mt-3 space-y-2.5">
                  {VIBE_DIMENSIONS.map((dimension) => (
                    <MetricBar
                      key={dimension}
                      label={t(DIMENSION_LABEL[dimension])}
                      value={data.dimensions[dimension]}
                    />
                  ))}
                  <MetricBar label={t("vibe.stress")} value={data.stressIndex} invert />
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-xs tracking-[0.15em] text-slate-500 uppercase">
                    {t("vibe.feeder")}
                  </h3>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {(Object.keys(FEEDER_LABEL) as (keyof typeof FEEDER_LABEL)[]).map((key) => (
                      <div
                        key={key}
                        className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2"
                      >
                        <p className="text-[0.6rem] tracking-wide text-slate-500 uppercase">
                          {t(FEEDER_LABEL[key])}
                        </p>
                        <p className="font-display text-lg text-slate-200">{data.feeder[key]}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs tracking-[0.15em] text-slate-500 uppercase">
                    {t("vibe.cis")}
                  </h3>
                  <div className="mt-3 rounded-xl border border-emerald-accent/20 bg-emerald-accent/5 p-4">
                    <span className="rounded-full bg-emerald-accent/15 px-2.5 py-0.5 text-[0.6rem] font-semibold tracking-wide text-emerald-accent uppercase">
                      {t(`vibe.cis.${data.cisInclusion.level}` as TranslationKey)}
                    </span>
                    <p className="mt-2 text-sm leading-relaxed text-slate-300">
                      {data.cisInclusion[language]}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {data.pulse.length > 0 && (
              <section>
                <h3 className="text-xs tracking-[0.15em] text-slate-500 uppercase">
                  {t("vibe.pulse")}
                </h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {data.pulse.map((item, index) => (
                    <p
                      key={index}
                      className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-sm leading-relaxed text-slate-300"
                    >
                      {item[language]}
                    </p>
                  ))}
                </div>
              </section>
            )}

            <section className="grid gap-6 sm:grid-cols-2">
              <BulletList
                title={t("vibe.pros")}
                items={data.pros.map((p) => p[language])}
                tone="emerald"
              />
              <BulletList
                title={t("vibe.tradeoffs")}
                items={data.tradeoffs.map((p) => p[language])}
                tone="amber"
              />
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function VibeIndexBadge({ value }: { value: number }) {
  const { t } = useLanguage();
  const tone = value >= 75 ? "text-emerald-accent border-emerald-accent/40 bg-emerald-accent/10" : "text-amber-highlight border-amber-highlight/40 bg-amber-highlight/10";
  return (
    <div className={`animate-fade-in rounded-xl border px-3 py-2 text-center ${tone}`}>
      <p className="font-display text-xl leading-none">{value}%</p>
      <p className="mt-1 text-[0.55rem] tracking-wide uppercase opacity-80">{t("vibe.index")}</p>
    </div>
  );
}

function SourceTag({ source }: { source: VibeCheck["source"] }) {
  const { t } = useLanguage();
  const live = source === "gemini";
  const Icon = live ? Wifi : WifiOff;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900/60 px-2.5 py-1 text-[0.6rem] tracking-wide text-slate-500 uppercase">
      <Icon className="h-3 w-3" />
      {t(live ? "vibe.source.gemini" : "vibe.source.fallback")}
    </span>
  );
}

/** `invert` flips the colour logic for metrics where lower is better. */
function MetricBar({
  label,
  value,
  invert = false,
}: {
  label: string;
  value: number;
  invert?: boolean;
}) {
  const good = invert ? value < 70 : value >= 70;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs text-slate-400">{label}</span>
        <span className={`font-display text-sm ${good ? "text-emerald-accent" : "text-amber-highlight"}`}>
          {value}
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full rounded-full transition-[width] duration-700 ease-out ${good ? "bg-emerald-accent" : "bg-amber-highlight"}`}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

function BulletList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "emerald" | "amber";
}) {
  const dot = tone === "emerald" ? "bg-emerald-accent" : "bg-amber-highlight";
  return (
    <div>
      <h3 className="text-xs tracking-[0.15em] text-slate-500 uppercase">{title}</h3>
      <ul className="mt-3 space-y-2.5">
        {items.map((item, index) => (
          <li key={index} className="flex gap-2.5 text-sm leading-relaxed text-slate-300">
            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Glassmorphic skeleton with a travelling emerald highlight. */
function VibeSkeleton({ label }: { label: string }) {
  return (
    <div className="mt-7" role="status" aria-live="polite">
      <p className="text-xs tracking-wide text-slate-500">{label}…</p>
      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Shimmer key={i} className="h-8" />
          ))}
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Shimmer key={i} className="h-14" />
            ))}
          </div>
          <Shimmer className="h-24" />
        </div>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Shimmer className="h-20" />
        <Shimmer className="h-20" />
      </div>
    </div>
  );
}

function Shimmer({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`animate-shimmer rounded-xl border border-slate-800/60 bg-[linear-gradient(100deg,var(--shimmer-base)_35%,var(--shimmer-glow)_50%,var(--shimmer-base)_65%)] bg-[length:200%_100%] ${className}`}
    />
  );
}

export default VibeCheckModal;
