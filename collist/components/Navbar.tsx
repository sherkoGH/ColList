"use client";

import Image from "next/image";

import LanguageSelectorDropdown from "@/components/ui/language-selector-dropdown";
import SkyToggle from "@/components/ui/sky-toggle";
import { useLanguage, type TranslationKey } from "@/context/LanguageContext";

const NAV_LINKS: { href: string; key: TranslationKey }[] = [
  { href: "#matches", key: "nav.matches" },
  { href: "#diagnostic", key: "nav.diagnostic" },
  { href: "#roadmap", key: "nav.roadmap" },
];

const MAIN_CONTENT_ID = "main-content";

export function Navbar() {
  const { t } = useLanguage();

  function scrollToMain() {
    document
      .getElementById(MAIN_CONTENT_ID)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-6">
        {/* Brand */}
        <a href="#top" className="group flex items-center gap-3">
          {/* The mark is transparent and already brand-emerald, so it needs no
              chip behind it and reads on both the night and day backgrounds.
              alt is empty because the wordmark beside it already names the app. */}
          <Image
            src="/collistlogo-mark.png"
            alt=""
            width={72}
            height={72}
            priority
            className="h-9 w-9 shrink-0 object-contain transition-transform duration-300 group-hover:scale-105"
          />
          <span className="flex flex-col leading-none">
            <span className="font-display text-lg tracking-[0.12em] text-slate-50">
              Col<span className="text-emerald-accent">List</span>
            </span>
            <span className="mt-1 hidden text-[0.6rem] tracking-[0.2em] text-slate-500 uppercase sm:block">
              {t("nav.tagline")}
            </span>
          </span>
        </a>

        {/* Section links */}
        <ul className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map(({ href, key }) => (
            <li key={href}>
              <a
                href={href}
                className="relative text-sm text-slate-400 transition-colors duration-200 after:absolute after:-bottom-1.5 after:left-0 after:h-px after:w-0 after:bg-emerald-accent after:transition-all after:duration-300 hover:text-slate-100 hover:after:w-full"
              >
                {t(key)}
              </a>
            </li>
          ))}
        </ul>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <SkyToggle />
          <LanguageSelectorDropdown />
          <button
            type="button"
            onClick={scrollToMain}
            className="cursor-pointer rounded-full bg-emerald-accent px-4 py-2 text-sm font-semibold text-slate-950 transition-all duration-300 hover:bg-emerald-accent/90 hover:shadow-[0_0_20px_-2px_rgba(16,185,129,0.6)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-accent"
          >
            {t("nav.cta")}
          </button>
        </div>
      </nav>
    </header>
  );
}

export default Navbar;
