"use client";

import { ExternalLink, Globe2, Plane, Search, Wallet } from "lucide-react";
import { useMemo, useState } from "react";

import { useLanguage, type TranslationKey } from "@/context/LanguageContext";
import directory from "@/data/funded-directory.json";

type Coverage = {
  tuition: boolean;
  roomBoard: boolean;
  travel: boolean;
  stipend: boolean;
  annualValue?: string;
  stipendAmount?: string;
  notes?: string;
};

type Eligibility = {
  internationals?: boolean;
  satRequired?: boolean;
  ieltsMin?: number;
  toeflMin?: number;
  notes?: string;
};

type Institution = {
  id: string;
  name: string;
  city: string;
  country: string;
  location: string;
  category?: string;
  scholarship?: string;
  scholarshipUrl?: string;
  deadline?: string;
  coverage: Coverage;
  eligibility: Eligibility;
  partialCaveat?: boolean;
};

type Directory = {
  source: { name: string; url: string; retrieved: string; note: string };
  institutions: Institution[];
};

const DATA = directory as Directory;
const PAGE = 12;

const COVERAGE_KEYS = [
  ["tuition", "dir.cov.tuition"],
  ["roomBoard", "dir.cov.roomBoard"],
  ["travel", "dir.cov.travel"],
  ["stipend", "dir.cov.stipend"],
] as const satisfies readonly (readonly [keyof Coverage, TranslationKey])[];

export function FundedDirectory() {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("");
  const [travelOnly, setTravelOnly] = useState(false);
  const [stipendOnly, setStipendOnly] = useState(false);
  const [shown, setShown] = useState(PAGE);

  const countries = useMemo(
    () => [...new Set(DATA.institutions.map((i) => i.country))].sort(),
    [],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return DATA.institutions.filter((i) => {
      if (q && !`${i.name} ${i.city} ${i.country}`.toLowerCase().includes(q)) return false;
      if (country && i.country !== country) return false;
      if (travelOnly && !i.coverage.travel) return false;
      if (stipendOnly && !i.coverage.stipend) return false;
      return true;
    });
  }, [query, country, travelOnly, stipendOnly]);

  const visible = filtered.slice(0, shown);
  const filtersActive = Boolean(query || country || travelOnly || stipendOnly);

  function reset() {
    setQuery("");
    setCountry("");
    setTravelOnly(false);
    setStipendOnly(false);
    setShown(PAGE);
  }

  return (
    <section id="directory" className="scroll-mt-16 px-6 pb-20">
      <div className="mx-auto max-w-7xl">
        <header className="mx-auto max-w-2xl text-center">
          <p className="text-[0.65rem] tracking-[0.2em] text-emerald-accent uppercase">
            {t("dir.eyebrow")}
          </p>
          <h2 className="font-display mt-2 text-2xl text-slate-50 sm:text-3xl">
            {t("dir.title")}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">{t("dir.subtitle")}</p>
        </header>

        {/* Controls ---------------------------------------------------- */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
          <label className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            <input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setShown(PAGE);
              }}
              placeholder={t("dir.search")}
              aria-label={t("dir.search")}
              className="w-64 rounded-full border border-slate-800 bg-slate-900/60 py-2 pr-4 pl-9 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-emerald-accent/60"
            />
          </label>

          <select
            value={country}
            onChange={(event) => {
              setCountry(event.target.value);
              setShown(PAGE);
            }}
            aria-label={t("dir.country")}
            className="cursor-pointer rounded-full border border-slate-800 bg-slate-900/60 px-4 py-2 text-sm text-slate-300 outline-none transition-colors focus:border-emerald-accent/60"
          >
            <option value="">{t("dir.allCountries")}</option>
            {countries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <FilterChip
            active={travelOnly}
            onClick={() => {
              setTravelOnly((v) => !v);
              setShown(PAGE);
            }}
            icon={Plane}
            label={t("dir.travelOnly")}
          />
          <FilterChip
            active={stipendOnly}
            onClick={() => {
              setStipendOnly((v) => !v);
              setShown(PAGE);
            }}
            icon={Wallet}
            label={t("dir.stipendOnly")}
          />

          {filtersActive && (
            <button
              type="button"
              onClick={reset}
              className="cursor-pointer rounded-full px-3 py-2 text-xs text-slate-500 transition-colors hover:text-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-accent"
            >
              {t("dir.clear")}
            </button>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-slate-500">
          {filtered.length} {t("dir.results")}
        </p>

        {/* Results ----------------------------------------------------- */}
        {filtered.length === 0 ? (
          <p className="mx-auto mt-8 max-w-md rounded-xl border border-dashed border-slate-800 bg-slate-900/30 px-5 py-6 text-center text-sm text-slate-400">
            {t("dir.noResults")}
          </p>
        ) : (
          <ul className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {visible.map((institution) => (
              <Card key={institution.id} institution={institution} />
            ))}
          </ul>
        )}

        {shown < filtered.length && (
          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => setShown((n) => n + PAGE)}
              className="cursor-pointer rounded-full border border-slate-700 px-6 py-2.5 text-sm text-slate-300 transition-colors hover:border-emerald-accent/60 hover:text-emerald-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-accent"
            >
              {t("dir.showMore")} ({filtered.length - shown})
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function FilterChip({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Plane;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      onClick={onClick}
      className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-4 py-2 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-accent ${
        active
          ? "border-emerald-accent/60 bg-emerald-accent/10 text-emerald-accent"
          : "border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function Card({ institution }: { institution: Institution }) {
  const { t } = useLanguage();
  const { coverage, eligibility } = institution;

  return (
    <li className="flex flex-col rounded-xl border border-slate-800 bg-slate-900/50 p-5 backdrop-blur-xl transition-all hover:border-emerald-500/40">
      <header>
        <h3 className="font-display text-base leading-snug text-slate-50">{institution.name}</h3>
        <p className="mt-1 flex items-center gap-1.5 text-[0.7rem] text-slate-500">
          <Globe2 className="h-3 w-3 shrink-0" />
          <span className="truncate">{institution.location}</span>
        </p>
      </header>

      {institution.scholarship && (
        <p className="mt-3 text-sm leading-relaxed text-slate-300">{institution.scholarship}</p>
      )}

      <div className="mt-4 flex flex-wrap gap-1.5">
        {COVERAGE_KEYS.filter(([key]) => coverage[key]).map(([key, label]) => (
          <span
            key={key}
            className="rounded-full bg-emerald-accent/10 px-2.5 py-0.5 text-[0.6rem] font-semibold text-emerald-accent"
          >
            {t(label)}
          </span>
        ))}
      </div>

      <dl className="mt-4 space-y-1.5 border-t border-slate-800/80 pt-3 text-xs">
        {institution.deadline && (
          <div className="flex justify-between gap-3">
            <dt className="shrink-0 text-slate-600">{t("dir.deadline")}</dt>
            <dd className="text-right text-slate-400">{institution.deadline}</dd>
          </div>
        )}
        {typeof eligibility.ieltsMin === "number" && (
          <div className="flex justify-between gap-3">
            <dt className="text-slate-600">{t("dir.ielts")}</dt>
            <dd className="text-slate-300">{eligibility.ieltsMin}</dd>
          </div>
        )}
        {coverage.annualValue && (
          <div className="flex justify-between gap-3">
            <dt className="shrink-0 text-slate-600">{t("dir.covers")}</dt>
            <dd className="text-right text-slate-400">{coverage.annualValue}</dd>
          </div>
        )}
      </dl>

      {institution.scholarshipUrl && (
        <a
          href={institution.scholarshipUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 transition-colors hover:border-emerald-accent/60 hover:text-emerald-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-accent"
        >
          {t("dir.aidPage")}
          <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </li>
  );
}

export default FundedDirectory;
