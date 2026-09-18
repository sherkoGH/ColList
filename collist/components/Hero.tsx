"use client";

import Image from "next/image";
import { ArrowDown } from "lucide-react";
import { useEffect, useState } from "react";

import OnboardingModal from "@/components/OnboardingModal";
import { useLanguage, type TranslationKey } from "@/context/LanguageContext";

/** Rotating targets. Order is deliberate: aspiration first, reachable last. */
const TARGETS: TranslationKey[] = [
  "hero.target.ivy",
  "hero.target.t20",
  "hero.target.nyuad",
  "hero.target.asia",
  "hero.target.lac",
];

const ROTATION_MS = 2600;
const NEXT_SECTION_ID = "funding-partners";

export function Hero() {
  const { t } = useLanguage();
  const [index, setIndex] = useState(0);
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  useEffect(() => {
    // Readers who ask for reduced motion get the first target, held still.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % TARGETS.length);
    }, ROTATION_MS);

    return () => window.clearInterval(timer);
  }, []);

  function scrollToNext() {
    document
      .getElementById(NEXT_SECTION_ID)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section
      id="hero"
      // 100svh, not 100vh: mobile URL bars make vh overshoot the visible area.
      className="relative isolate flex min-h-[calc(100svh-4rem)] flex-col overflow-hidden"
    >
      {/* Campus backdrop. `fill` + an explicit min-height on the section means
          the box is reserved before the bitmap decodes, so nothing shifts. */}
      <Image
        src="/enhanced_stanf.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="-z-20 object-cover object-center"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-950/90 via-slate-950/65 to-slate-950/95"
      />

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-between gap-16 px-6 py-12 text-center sm:py-16">
        {/* Sky band — headline sits in the open air above the rooflines. */}
        <div className="flex flex-col items-center">
          <span className="rounded-full border border-emerald-accent/30 bg-emerald-accent/10 px-4 py-1.5 text-[0.65rem] font-semibold tracking-[0.2em] text-emerald-accent uppercase backdrop-blur-sm">
            {t("hero.eyebrow")}
          </span>

          <h1 className="font-display mt-7 text-4xl leading-tight font-normal text-slate-50 sm:text-5xl lg:text-6xl">
            {t("hero.headline")}
            <span className="mt-2 flex min-h-[1.25em] items-center justify-center sm:min-h-[1.2em]">
              {/* Keyed so the fade replays on every swap. */}
              <span
                key={index}
                className="animate-fade-in bg-gradient-to-r from-emerald-accent via-emerald-300 to-amber-highlight bg-clip-text text-transparent"
              >
                {t(TARGETS[index])}
              </span>
            </span>
          </h1>
        </div>

        {/* Lawn band — CTA lands on the grass, well clear of the buildings. */}
        <div className="flex flex-col items-center">
          <p className="max-w-2xl text-balance text-slate-300 sm:text-lg">
            {t("hero.subtitle")}
          </p>

          <button
            type="button"
            onClick={() => setOnboardingOpen(true)}
            className="mt-9 cursor-pointer rounded-full bg-emerald-500 px-8 py-3.5 font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 transition-all duration-300 hover:bg-emerald-400 hover:shadow-xl hover:shadow-emerald-400/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-accent"
          >
            {t("hero.cta")}
          </button>

          <button
            type="button"
            onClick={scrollToNext}
            className="mt-6 flex cursor-pointer items-center gap-2 text-xs tracking-wide text-slate-400 transition-colors hover:text-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-accent"
          >
            <ArrowDown className="h-3.5 w-3.5 animate-bounce" />
            {t("hero.scrollHint")}
          </button>
        </div>
      </div>

      {onboardingOpen && <OnboardingModal onClose={() => setOnboardingOpen(false)} />}
    </section>
  );
}

export default Hero;
