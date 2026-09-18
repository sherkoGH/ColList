"use client";

import Image from "next/image";
import { useState } from "react";

import { FUNDING_LABEL } from "@/components/CollegeDetailDrawer";
import { useLanguage } from "@/context/LanguageContext";
import universities from "@/data/universities.json";
import type { University } from "@/lib/matcher";

const INSTITUTIONS = universities as University[];

/**
 * University mark. Logos are set on a light chip because most institutional
 * marks are dark navy or black — on the Deep Slate background they would
 * otherwise disappear, and the chip keeps them legible in both themes.
 */
function Logo({ university }: { university: University }) {
  const [failed, setFailed] = useState(false);
  const initials = university.name
    .replace(/^The\s+/i, "")
    .split(/\s+/)
    .filter((word) => /^[A-Za-z]/.test(word))
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");

  if (!university.logo || failed) {
    return (
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-800 text-[0.6rem] font-semibold text-slate-300">
        {initials}
      </span>
    );
  }

  return (
    <span className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full bg-white/95 p-1">
      <Image
        src={university.logo}
        alt=""
        width={44}
        height={44}
        className="h-full w-full object-contain"
        onError={() => setFailed(true)}
      />
    </span>
  );
}

function Pill({ university }: { university: University }) {
  const { t } = useLanguage();

  return (
    // Spacing lives on the pill, not as a flex `gap`: each half of the track
    // must measure exactly the same, or the -50% loop lands mid-gap and jumps.
    <li className="mr-4 flex shrink-0 items-center gap-2.5 rounded-full border border-slate-800/80 bg-slate-900/60 py-2 pr-5 pl-2 text-sm font-medium text-slate-200 backdrop-blur-md select-none">
      <Logo university={university} />
      {university.name}
      <span className="rounded-full bg-emerald-accent/10 px-2.5 py-0.5 text-[0.65rem] font-semibold tracking-wide text-emerald-accent">
        {t(FUNDING_LABEL[university.fundingType])}
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
        </div>
      </div>

      {/* `group` drives pause-on-hover; the mask feathers both edges so pills
          fade out instead of being sliced off by the viewport. */}
      <div className="group relative mt-8 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
        <div className="animate-marquee flex w-max group-hover:[animation-play-state:paused]">
          <ul className="flex">
            {INSTITUTIONS.map((university) => (
              <Pill key={university.id} university={university} />
            ))}
          </ul>
          {/* Identical second pass completes the -50% cycle seamlessly. */}
          <ul className="flex" aria-hidden>
            {INSTITUTIONS.map((university) => (
              <Pill key={`${university.id}-loop`} university={university} />
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export default LogoCarousel;
