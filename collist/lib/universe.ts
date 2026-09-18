import curated from "@/data/universities.json";
import directory from "@/data/funded-directory.json";
import type { FundingType, MatchCategory, University } from "@/lib/matcher";

type DirectoryEntry = {
  id: string;
  name: string;
  location: string;
  country: string;
  category?: string;
  scholarship?: string;
  scholarshipUrl?: string;
  coverage: { tuition: boolean; roomBoard: boolean; travel: boolean; stipend: boolean };
  eligibility: { ieltsMin?: number; satRequired?: boolean; internationals?: boolean };
  benchmarks?: { acceptanceRate: string; avgSat?: number; coaUsd?: number; source: string };
};

type DirectoryFile = { source: { name: string; url: string }; institutions: DirectoryEntry[] };

const CURATED = curated as University[];
const DIRECTORY = (directory as DirectoryFile).institutions;

/** Infer the aid model from the programme's own wording. */
function fundingTypeOf(entry: DirectoryEntry): FundingType {
  const text = (entry.scholarship ?? "").toLowerCase();
  if (text.includes("need-blind") || text.includes("need blind")) return "100% Need-Blind";
  if (text.includes("merit")) return "Full-Ride Merit";
  return "Full-Tuition Guaranteed";
}

/** Their taxonomy is only a display hint; the real bucket is computed per profile. */
function baselineCategory(entry: DirectoryEntry): MatchCategory {
  return entry.category === "ivy" ? "Dream" : "Target";
}

function tagsOf(entry: DirectoryEntry): string[] {
  const tags: string[] = [];
  if (entry.coverage.travel) tags.push("Travel Covered");
  if (entry.coverage.stipend) tags.push("Stipend Included");
  if (entry.eligibility.satRequired === false) tags.push("Test Optional");
  if (entry.category === "lac") tags.push("Liberal Arts");
  return tags;
}

function toUniversity(entry: DirectoryEntry): University {
  const b = entry.benchmarks!;
  return {
    id: entry.id,
    name: entry.name,
    location: entry.location,
    fundingType: fundingTypeOf(entry),
    category: baselineCategory(entry),
    // minGpa is deliberately absent: no public source publishes it, and the
    // matcher redistributes its weight rather than inventing a threshold.
    avgSat: b.avgSat,
    avgIelts: entry.eligibility.ieltsMin ?? 6.5,
    acceptanceRate: b.acceptanceRate,
    coaUsd: b.coaUsd,
    cdsVerifiedTag: b.source,
    tags: tagsOf(entry),
    // Programme text is reproduced as published; the source is English-only.
    description: {
      en: entry.scholarship ?? "",
      ru: entry.scholarship ?? "",
    },
    domain: entry.scholarshipUrl,
  };
}

/**
 * The pool the 8-college matrix ranks against.
 *
 * Curated entries win on id collision: they carry bilingual descriptions and
 * hand-checked funding detail the directory does not. Directory entries join
 * only when they have real federal benchmarks — an institution with no
 * published admissions data cannot be given odds, so it stays browse-only.
 */
export function getMatchableUniversities(): University[] {
  const seen = new Set(CURATED.map((u) => u.id));
  const extra = DIRECTORY.filter((e) => e.benchmarks && !seen.has(e.id)).map(toUniversity);
  return [...CURATED, ...extra];
}

/** Institutions shown in the directory but not rankable, for honest UI counts. */
export function getBrowseOnlyCount(): number {
  return DIRECTORY.filter((e) => !e.benchmarks).length;
}
