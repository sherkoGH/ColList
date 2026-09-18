"use client";

import { useLanguage, type TranslationKey } from "@/context/LanguageContext";

type Institution = { name: string; aid: TranslationKey };

/**
 * Curated full-funding institutions. Each carries its aid posture rather than
 * a bare name — a pill with no funding signal tells a student nothing.
 */
const INSTITUTIONS: Institution[] = [
  { name: "Harvard", aid: "aid.needBlind" },
  { name: "MIT", aid: "aid.needBlind" },
  { name: "Stanford", aid: "aid.fullNeed" },
  { name: "Princeton", aid: "aid.noLoan" },
  { name: "Yale", aid: "aid.needBlind" },
  { name: "Amherst", aid: "aid.needBlind" },
  { name: "Williams", aid: "aid.fullNeed" },
  { name: "NYU Abu Dhabi", aid: "aid.fullRide" },
  { name: "KAIST", aid: "aid.fullScholarship" },
  { name: "HKUST", aid: "aid.fullScholarship" },
  { name: "Minerva", aid: "aid.fullNeed" },
  { name: "Duke Karsh", aid: "aid.fullRide" },
];

function Pill({ institution }: { institution: Institution }) {
  const { t } = useLanguage();

  return (
    // Spacing lives on the pill, not as a flex `gap`: each half of the track
    // must measure exactly the same, or the -50% loop lands mid-gap and jumps.
    <li className="mr-4 flex shrink-0 items-center gap-3 rounded-full border border-slate-800/80 bg-slate-900/60 px-5 py-2.5 text-sm font-medium text-slate-200 backdrop-blur-md select-none">
      {institution.name}
      <span className="rounded-full bg-emerald-accent/10 px-2.5 py-0.5 text-[0.65rem] font-semibold tracking-wide text-emerald-accent">
        {t(institution.aid)}
      </span>
    </li>
  );
}

export function LogoCarousel() {
  const { t } = useLanguage();

  return (
    <section id="funding-partners" className="scroll-mt-16 border-y border-slate-900 py-12">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-wrap items-center justify-center gap-3 text-center">
          <span className="text-[0.65rem] tracking-[0.22em] text-slate-500 uppercase">
            {t("marquee.label")}
          </span>
          <span className="rounded-full border border-amber-highlight/30 bg-amber-highlight/10 px-2.5 py-0.5 text-[0.6rem] font-semibold tracking-wide text-amber-highlight uppercase">
            {t("marquee.disclaimer")}
          </span>
        </div>
      </div>

      {/* `group` drives pause-on-hover; the mask feathers both edges so pills
          fade out instead of being sliced off by the viewport. */}
      <div className="group relative mt-8 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
        <div className="animate-marquee flex w-max group-hover:[animation-play-state:paused]">
          <ul className="flex">
            {INSTITUTIONS.map((institution) => (
              <Pill key={institution.name} institution={institution} />
            ))}
          </ul>
          {/* Identical second pass completes the -50% cycle seamlessly. */}
          <ul className="flex" aria-hidden>
            {INSTITUTIONS.map((institution) => (
              <Pill key={`${institution.name}-loop`} institution={institution} />
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export default LogoCarousel;
