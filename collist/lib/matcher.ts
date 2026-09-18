import {
  normalizeGpa,
  type EcTier,
  type Region,
  type UserProfile,
} from "@/context/UserContext";
import { calculateProfileDiagnostic } from "@/lib/diagnostic";

export type FundingType = "100% Need-Blind" | "Full-Ride Merit" | "Full-Tuition Guaranteed";
export type MatchCategory = "Dream" | "Target" | "Safety";

export type University = {
  id: string;
  name: string;
  location: string;
  fundingType: FundingType;
  category: MatchCategory;
  minGpa: number;
  avgSat: number;
  avgIelts: number;
  acceptanceRate: string;
  coaUsd: number;
  /** Used to source the logo; also handy for outbound links later. */
  domain?: string;
  /** Path under /public. Absent means the UI falls back to a monogram. */
  logo?: string;
  cdsVerifiedTag: string;
  tags: string[];
  description: { en: string; ru: string };
};

export type Bilingual = { en: string; ru: string };

export type CollegeMatch = {
  university: University;
  /** Recomputed per profile — not the dataset's static `category`. */
  category: MatchCategory;
  admissionsOdds: number;
  fundingOdds: number;
  /** Ranking score after the regional boost. Display uses the odds instead. */
  matchScore: number;
  region: Region;
  regionBoosted: boolean;
  gaps: {
    gpa: { you: number; needed: number; meets: boolean };
    sat: { you: number | null; average: number; meets: boolean; neutral: boolean };
    english: { you: number | null; average: number; meets: boolean; neutral: boolean };
  };
  netPriceUsd: number;
  strategicWhys: Bilingual[];
};

/** Boost applied to ranking when a university sits in a preferred region. */
const REGION_BOOST = 0.12;

const clamp = (value: number, min: number, max: number) =>
  Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min;

const clamp01 = (value: number) => clamp(value, 0, 1);

/** Country fragment -> region bucket, matched against the tail of `location`. */
const REGION_BY_COUNTRY: [string, Region][] = [
  ["USA", "US"],
  ["United Arab Emirates", "Middle East"],
  ["Germany", "Europe"],
  ["South Korea", "Asia"],
  ["Hong Kong", "Asia"],
  ["China", "Asia"],
  ["Kazakhstan", "Asia"],
];

export function regionOf(location: string): Region {
  for (const [needle, region] of REGION_BY_COUNTRY) {
    if (location.includes(needle)) return region;
  }
  return "Asia";
}

function parseAcceptanceRate(raw: string): number {
  const value = Number.parseFloat(String(raw).replace("%", "").trim());
  return Number.isFinite(value) ? clamp(value / 100, 0.01, 1) : 0.2;
}

/** Bring TOEFL and Duolingo onto the IELTS band the dataset is expressed in. */
export function toIeltsEquivalent(score: number, test: UserProfile["englishTest"]): number {
  if (test === "IELTS") return clamp(score, 0, 9);
  if (test === "TOEFL") return clamp(4.5 + ((score - 45) / (110 - 45)) * (8 - 4.5), 0, 9);
  return clamp(4.5 + ((score - 60) / (130 - 60)) * (8 - 4.5), 0, 9);
}

type ProfileSignals = {
  normalizedGpa: number;
  satScore: number | null;
  ieltsEquivalent: number | null;
  ecStrength: number;
  academicStrength: number;
  testingNeutral: boolean;
};

function readProfile(profile: UserProfile): ProfileSignals {
  const diagnostic = calculateProfileDiagnostic(profile);
  const hasSat = profile.satStatus === "taken" && typeof profile.satScore === "number";
  const hasEnglish =
    profile.englishStatus === "taken" && typeof profile.englishScore === "number";

  return {
    normalizedGpa: normalizeGpa(profile.gpaRaw ?? 0, profile.gpaScale ?? 4),
    satScore: hasSat ? (profile.satScore as number) : null,
    ieltsEquivalent: hasEnglish
      ? toIeltsEquivalent(profile.englishScore as number, profile.englishTest)
      : null,
    ecStrength: diagnostic.ecImpactScore / 100,
    academicStrength: diagnostic.academicFitnessScore / 100,
    testingNeutral: !hasSat && !hasEnglish,
  };
}

/**
 * Fit of one dimension against one institution, centred on 0.5.
 * 0.5 means "exactly at their benchmark", 1 well above, 0 well below.
 */
const fitAround = (value: number, benchmark: number, spread: number) =>
  clamp01(0.5 + (value - benchmark) / spread / 2);

function testFit(signals: ProfileSignals, university: University): number {
  const parts: number[] = [];
  if (signals.satScore !== null) {
    parts.push(fitAround(signals.satScore, university.avgSat, 200));
  }
  if (signals.ieltsEquivalent !== null) {
    parts.push(fitAround(signals.ieltsEquivalent, university.avgIelts, 1.5));
  }
  // Test-optional / not yet taken is neutral, never a zero.
  if (parts.length === 0) return 0.5;
  return parts.reduce((sum, value) => sum + value, 0) / parts.length;
}

function admissionsOdds(signals: ProfileSignals, university: University): number {
  const gpa = fitAround(signals.normalizedGpa, university.minGpa, 0.8);
  const test = testFit(signals, university);
  const ec = clamp01(signals.ecStrength);

  const strength = 0.45 * gpa + 0.3 * test + 0.25 * ec;
  const base = parseAcceptanceRate(university.acceptanceRate);

  // A strong profile multiplies the published rate; a weak one shrinks it.
  const multiplier = 0.25 + 3.5 * strength ** 2;
  return Math.round(clamp(base * multiplier * 100, 2, 95));
}

/**
 * Funding viability is scored independently of admission: given a place, how
 * likely is this institution to cover the whole cost for this student?
 */
function fundingOdds(signals: ProfileSignals, university: University): number {
  const meetsAcademicFloor = signals.normalizedGpa >= university.minGpa;
  const academicFit = clamp01(
    0.5 + (signals.normalizedGpa - university.minGpa) / 1.2,
  );

  switch (university.fundingType) {
    case "100% Need-Blind": {
      // Need is met in full as policy; the risk sits in clearing admission.
      return Math.round(clamp(86 + academicFit * 12, 60, 98));
    }
    case "Full-Tuition Guaranteed": {
      // Threshold-driven: clear the academic floor and funding follows.
      const base = meetsAcademicFloor ? 88 : 62;
      return Math.round(clamp(base + academicFit * 9, 45, 97));
    }
    case "Full-Ride Merit":
    default: {
      // A competition, not a policy — leadership depth carries the most weight.
      const merit = 0.5 * signals.ecStrength + 0.3 * academicFit + 0.2 * testFit(signals, university);
      return Math.round(clamp(18 + merit * 68, 10, 88));
    }
  }
}

function categorise(odds: number): MatchCategory {
  if (odds < 15) return "Dream";
  if (odds <= 45) return "Target";
  return "Safety";
}

const TIER_LABEL: Record<EcTier, Bilingual> = {
  "Olympiads/Research": { en: "olympiad and research work", ru: "олимпиады и исследования" },
  "Leadership/Projects": { en: "founding and leadership work", ru: "основание проектов и лидерство" },
  "Community/Varsity": { en: "community and varsity commitment", ru: "общественная работа и спорт" },
};

const MAJOR_TAGS: Record<string, string[]> = {
  cs: ["STEM Heavy", "Research Focus", "Entrepreneurship"],
  engineering: ["STEM Heavy", "Research Focus"],
  sciences: ["STEM Heavy", "Research Focus", "Undergraduate Priority"],
  business: ["Entrepreneurship", "Global Campus", "Dual Degree"],
  humanities: ["Liberal Arts", "Humanities Strength", "Open Curriculum", "Tutorial System"],
};

function strategicWhys(
  profile: UserProfile,
  signals: ProfileSignals,
  university: University,
  odds: { admissions: number; funding: number },
  region: Region,
  regionBoosted: boolean,
): Bilingual[] {
  const whys: Bilingual[] = [];

  // Funding archetype — always first; it is the reason this list exists.
  const archetype: Record<FundingType, Bilingual> = {
    "100% Need-Blind": {
      en: `${university.name} meets demonstrated need in full, so admission and funding are effectively the same decision. Clear the bar and the cost question is closed.`,
      ru: `${university.name} полностью покрывает подтверждённую нужду, поэтому поступление и финансирование — по сути одно решение. Пройдёте отбор — вопрос стоимости закрыт.`,
    },
    "Full-Tuition Guaranteed": {
      en: `Funding here is threshold-based rather than competitive: meet the academic floor and full tuition follows, which is why it anchors a list instead of gambling on it.`,
      ru: `Финансирование здесь пороговое, а не конкурсное: пройдите академический минимум — и обучение покрыто полностью. Поэтому такой вуз держит список, а не рискует им.`,
    },
    "Full-Ride Merit": {
      en: `The full ride here is won, not granted. Your record competes directly against other applicants, so the funding odds move with your activities more than your grades.`,
      ru: `Полный грант здесь выигрывают, а не получают. Ваш профиль конкурирует напрямую с другими, поэтому шансы на финансирование зависят от активностей сильнее, чем от оценок.`,
    },
  };
  whys.push(archetype[university.fundingType]);

  // Academic gap, stated plainly in either direction.
  const delta = signals.normalizedGpa - university.minGpa;
  whys.push(
    delta >= 0
      ? {
          en: `Your ${signals.normalizedGpa.toFixed(2)} sits ${delta.toFixed(2)} above their ${university.minGpa.toFixed(2)} benchmark — academics are not what will decide this application.`,
          ru: `Ваш ${signals.normalizedGpa.toFixed(2)} на ${delta.toFixed(2)} выше их ориентира ${university.minGpa.toFixed(2)} — решать будет не академика.`,
        }
      : {
          en: `Your ${signals.normalizedGpa.toFixed(2)} is ${Math.abs(delta).toFixed(2)} below their ${university.minGpa.toFixed(2)} benchmark. Everything else in the application has to carry that difference.`,
          ru: `Ваш ${signals.normalizedGpa.toFixed(2)} на ${Math.abs(delta).toFixed(2)} ниже их ориентира ${university.minGpa.toFixed(2)}. Остальная часть заявки должна компенсировать этот разрыв.`,
        },
  );

  // Major alignment against the institution's own tags.
  const wanted = MAJOR_TAGS[profile.majorInterest] ?? [];
  const overlap = university.tags.filter((tag) => wanted.includes(tag));
  if (overlap.length > 0) {
    whys.push({
      en: `Tagged ${overlap.join(", ")} — a direct match for the field you selected.`,
      ru: `Отмечено как ${overlap.join(", ")} — прямое совпадение с выбранным направлением.`,
    });
  }

  // Extracurricular leverage, tied to their actual strongest tier.
  if (profile.activities.length > 0) {
    const tier = TIER_LABEL[profile.ecTier];
    whys.push({
      en: `Your ${tier.en} is the part of this application with the most leverage here, given a ${odds.funding}% funding viability.`,
      ru: `Ваши ${tier.ru} дают здесь наибольший рычаг при ${odds.funding}% вероятности финансирования.`,
    });
  } else {
    whys.push({
      en: `No activities are logged yet, which caps what this application can argue. Two substantive entries would move the ${odds.admissions}% admissions figure more than any test retake.`,
      ru: `Активности пока не указаны, и это ограничивает аргументацию заявки. Две содержательные записи поднимут показатель ${odds.admissions}% сильнее, чем пересдача теста.`,
    });
  }

  // Testing posture.
  if (signals.testingNeutral) {
    whys.push({
      en: `Scored on a test-neutral basis. A ${university.avgSat} SAT or ${university.avgIelts} IELTS is their benchmark if you decide to submit.`,
      ru: `Оценка без учёта тестов. Их ориентир — SAT ${university.avgSat} или IELTS ${university.avgIelts}, если решите подавать баллы.`,
    });
  }

  // Region: ranking only, never exclusion — stated to the student explicitly.
  if (regionBoosted) {
    whys.push({
      en: `${region} is one of your preferred regions, so this ranks higher. Universities outside your regions are still shown and still fundable.`,
      ru: `${region} — один из ваших предпочтительных регионов, поэтому позиция выше. Вузы вне ваших регионов по-прежнему показываются и по-прежнему финансируются.`,
    });
  }

  return whys;
}

function evaluate(
  profile: UserProfile,
  signals: ProfileSignals,
  university: University,
  preferred: Set<string>,
): CollegeMatch {
  const admissions = admissionsOdds(signals, university);
  const funding = fundingOdds(signals, university);
  const region = regionOf(university.location);
  const regionBoosted = preferred.has(region);

  // The boost lands on the ranking score only. The candidate pool is never
  // filtered by region — see `calculateCollegeMatches`.
  const boost = 1 + (regionBoosted ? REGION_BOOST : 0);
  const category = categorise(admissions);

  // Ranking key differs by bucket. A "Dream" is meant to be a high-prestige
  // reach that would still fund you, so it ranks on selectivity and funding —
  // ranking reaches by combined odds just surfaces the easiest reaches and
  // quietly drops the most selective universities off the list entirely.
  const prestige = (1 - parseAcceptanceRate(university.acceptanceRate)) * 100;
  const rankBase =
    category === "Dream" ? 0.5 * funding + 0.5 * prestige : 0.5 * admissions + 0.5 * funding;
  const matchScore = rankBase * boost;

  return {
    university,
    category,
    admissionsOdds: admissions,
    fundingOdds: funding,
    matchScore: Math.round(matchScore * 100) / 100,
    region,
    regionBoosted,
    gaps: {
      gpa: {
        you: signals.normalizedGpa,
        needed: university.minGpa,
        meets: signals.normalizedGpa >= university.minGpa,
      },
      sat: {
        you: signals.satScore,
        average: university.avgSat,
        meets: signals.satScore !== null && signals.satScore >= university.avgSat,
        neutral: signals.satScore === null,
      },
      english: {
        you: signals.ieltsEquivalent,
        average: university.avgIelts,
        meets:
          signals.ieltsEquivalent !== null && signals.ieltsEquivalent >= university.avgIelts,
        neutral: signals.ieltsEquivalent === null,
      },
    },
    // The target outcome is full funding, so the net price a student is
    // working toward is zero. Family income is never collected, by design.
    netPriceUsd: 0,
    strategicWhys: strategicWhys(
      profile,
      signals,
      university,
      { admissions, funding },
      region,
      regionBoosted,
    ),
  };
}

const QUOTA: Record<MatchCategory, number> = { Dream: 2, Target: 4, Safety: 2 };
const TOTAL = 8;

/**
 * Rank every university against the profile and return a balanced roster of
 * 2 Dream / 4 Target / 2 Safety.
 *
 * Regional preference is a ranking multiplier and nothing else: every
 * university in the dataset enters scoring, and short buckets are backfilled
 * from the remaining pool so the roster always reaches eight.
 */
export function calculateCollegeMatches(
  profile: UserProfile,
  universities: University[],
): CollegeMatch[] {
  const pool = universities ?? [];
  if (pool.length === 0) return [];

  // Normalise collections once so neither scoring nor narrative can reach a
  // `.length` on an undefined array.
  const safe: UserProfile = {
    ...profile,
    activities: profile.activities ?? [],
    honors: profile.honors ?? [],
    preferredRegions: profile.preferredRegions ?? [],
  };

  const signals = readProfile(safe);
  const preferred = new Set<string>(safe.preferredRegions);

  const scored = pool
    .map((university) => evaluate(safe, signals, university, preferred))
    .sort((a, b) => b.matchScore - a.matchScore);

  const chosen: CollegeMatch[] = [];
  const taken = new Set<string>();

  for (const category of ["Dream", "Target", "Safety"] as const) {
    for (const match of scored) {
      if (chosen.filter((m) => m.category === category).length >= QUOTA[category]) break;
      if (match.category !== category || taken.has(match.university.id)) continue;
      chosen.push(match);
      taken.add(match.university.id);
    }
  }

  // A thin dataset, or a profile for which nothing is genuinely a safety, can
  // leave a bucket short. Backfill with the candidates whose odds sit closest
  // to the missing bucket, so the roster still spans reach-to-realistic.
  // Categories are never relabelled to force a 2/4/2 shape: telling a student
  // a 4% school is a "Safety" is the one failure mode worth avoiding here.
  const BUCKET_CENTRE: Record<MatchCategory, number> = { Dream: 8, Target: 30, Safety: 70 };

  while (chosen.length < TOTAL) {
    const deficits = (["Safety", "Dream", "Target"] as const).filter(
      (category) => chosen.filter((m) => m.category === category).length < QUOTA[category],
    );
    const centre = BUCKET_CENTRE[deficits[0] ?? "Target"];

    const remaining = scored.filter((match) => !taken.has(match.university.id));
    if (remaining.length === 0) break;

    const next = remaining.reduce((best, match) =>
      Math.abs(match.admissionsOdds - centre) < Math.abs(best.admissionsOdds - centre) ? match : best,
    );
    chosen.push(next);
    taken.add(next.university.id);
  }

  const order: Record<MatchCategory, number> = { Dream: 0, Target: 1, Safety: 2 };
  return chosen
    .slice(0, TOTAL)
    .sort((a, b) => order[a.category] - order[b.category] || b.matchScore - a.matchScore);
}
