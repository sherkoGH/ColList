import type { UserProfile } from "@/context/UserContext";
import qualitativeData from "@/data/qualitativeData.json";
import type { University } from "@/lib/matcher";

export type Bilingual = { en: string; ru: string };

export const VIBE_DIMENSIONS = [
  "academicIntensity",
  "collaboration",
  "globalPrestige",
  "internationalInclusivity",
  "workLifeBalance",
] as const;
export type VibeDimension = (typeof VIBE_DIMENSIONS)[number];

export type QualitativeRecord = {
  id: string;
  dimensions: Record<VibeDimension, number>;
  stressIndex: number;
  feeder: { tech: number; quant: number; gradSchool: number; alumniLeverage: number };
  cisInclusion: { level: "exceptional" | "strong" | "moderate" } & Bilingual;
  pulse: Bilingual[];
};

export type VibeCheck = {
  universityId: string;
  /** Which engine produced this — surfaced in the UI, never guessed. */
  source: "gemini" | "fallback";
  vibeMatchIndex: number;
  dimensions: Record<VibeDimension, number>;
  stressIndex: number;
  feeder: QualitativeRecord["feeder"];
  cisInclusion: QualitativeRecord["cisInclusion"];
  pulse: Bilingual[];
  pros: Bilingual[];
  tradeoffs: Bilingual[];
};

const RECORDS = qualitativeData as QualitativeRecord[];

export function getQualitativeRecord(universityId: string): QualitativeRecord | null {
  return RECORDS.find((record) => record.id === universityId) ?? null;
}

const clamp = (value: number, min = 0, max = 100) =>
  Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min;

/**
 * What each field of study wants from a campus. Used both to weight the vibe
 * index and to decide which pros are worth surfacing for this student.
 */
const MAJOR_PRIORITIES: Record<string, Partial<Record<VibeDimension, number>>> = {
  cs: { academicIntensity: 1.2, globalPrestige: 1.2, collaboration: 1.1 },
  engineering: { academicIntensity: 1.3, collaboration: 1.1 },
  sciences: { academicIntensity: 1.2, collaboration: 1.1, globalPrestige: 1.1 },
  business: { globalPrestige: 1.3, collaboration: 1.1 },
  humanities: { collaboration: 1.2, workLifeBalance: 1.1, globalPrestige: 1.1 },
};

const FEEDER_BY_MAJOR: Record<string, { key: keyof QualitativeRecord["feeder"]; en: string; ru: string }> = {
  cs: { key: "tech", en: "technology recruiting", ru: "рекрутинг в технологические компании" },
  engineering: { key: "tech", en: "engineering recruiting", ru: "инженерный рекрутинг" },
  business: { key: "quant", en: "finance and quant recruiting", ru: "рекрутинг в финансы и quant" },
  sciences: { key: "gradSchool", en: "graduate school placement", ru: "поступление в аспирантуру" },
  humanities: { key: "gradSchool", en: "graduate school placement", ru: "поступление в аспирантуру" },
};

/**
 * What this student needs from a campus, per dimension.
 *
 * Inclusivity is pinned high for everyone: the entire product serves
 * internationals seeking full aid, so a campus that is cold to them fails
 * regardless of how it scores elsewhere.
 */
function desiredProfile(profile: UserProfile): Record<VibeDimension, number> {
  const driven = profile.ecTier === "Olympiads/Research";
  const prestigeDriven = profile.majorInterest === "business" || profile.majorInterest === "cs";

  return {
    academicIntensity: driven ? 92 : 72,
    collaboration: 80,
    globalPrestige: prestigeDriven ? 90 : 74,
    internationalInclusivity: 90,
    // Someone chasing olympiad-tier intensity has already accepted the cost.
    workLifeBalance: driven ? 52 : 74,
  };
}

/**
 * How well this campus suits this student, 0–100.
 *
 * Scored on shortfall, not on raw quality: exceeding what the student needs is
 * never a penalty, while falling short costs proportionally. A plain weighted
 * average of the five dimensions rates every strong university at roughly the
 * same number and tells the student nothing.
 */
function vibeMatchIndex(record: QualitativeRecord, profile: UserProfile): number {
  const desired = desiredProfile(profile);
  const priorities = MAJOR_PRIORITIES[profile.majorInterest] ?? {};

  /** Each point of shortfall costs this much of the dimension's score. */
  const SHORTFALL_COST = 1.4;

  let weighted = 0;
  let totalWeight = 0;

  for (const dimension of VIBE_DIMENSIONS) {
    const actual = record.dimensions[dimension];
    const target = desired[dimension];
    const shortfall = Math.max(0, target - actual);
    const dimensionScore = clamp(100 - shortfall * SHORTFALL_COST);

    const base = dimension === "internationalInclusivity" ? 1.25 : 1;
    const weight = base * (priorities[dimension] ?? 1);

    weighted += dimensionScore * weight;
    totalWeight += weight;
  }

  const fit = totalWeight > 0 ? weighted / totalWeight : 0;

  // A punishing campus costs a student who is not already running at that pace.
  const stressPenalty =
    profile.ecTier === "Olympiads/Research" ? 0 : Math.max(0, record.stressIndex - 72) * 0.25;

  return Math.round(clamp(fit - stressPenalty));
}

function buildPros(
  record: QualitativeRecord,
  university: University,
  profile: UserProfile,
): Bilingual[] {
  const pros: Bilingual[] = [];
  const d = record.dimensions;

  // 1. Field-specific feeder strength.
  const feeder = FEEDER_BY_MAJOR[profile.majorInterest];
  if (feeder) {
    const rating = record.feeder[feeder.key];
    pros.push({
      en: `${feeder.en.charAt(0).toUpperCase()}${feeder.en.slice(1)} scores ${rating}/100 here — directly relevant to the field you selected.`,
      ru: `${feeder.ru.charAt(0).toUpperCase()}${feeder.ru.slice(1)} оценивается в ${rating}/100 — это напрямую касается выбранного направления.`,
    });
  } else {
    pros.push({
      en: `Alumni network leverage scores ${record.feeder.alumniLeverage}/100, which carries across fields.`,
      ru: `Сила сети выпускников — ${record.feeder.alumniLeverage}/100, и это работает для любого направления.`,
    });
  }

  // 2. CIS and international standing — the reason this product exists.
  pros.push({ en: record.cisInclusion.en, ru: record.cisInclusion.ru });

  // 3. The campus's own strongest dimension, named honestly.
  const strongest = VIBE_DIMENSIONS.reduce((best, dimension) =>
    d[dimension] > d[best] ? dimension : best,
  );
  const strengthCopy: Record<VibeDimension, Bilingual> = {
    academicIntensity: {
      en: `Academic intensity sits at ${d.academicIntensity}/100 — the pace itself is the draw if you want to be pushed.`,
      ru: `Академическая интенсивность — ${d.academicIntensity}/100: если хотите, чтобы вас подталкивали, темп здесь и есть главное.`,
    },
    collaboration: {
      en: `Collaboration scores ${d.collaboration}/100; students work together by default rather than competing for rank.`,
      ru: `Сотрудничество — ${d.collaboration}/100: студенты работают вместе, а не соревнуются за рейтинг.`,
    },
    globalPrestige: {
      en: `Global brand equity is ${d.globalPrestige}/100, which travels back to the CIS job market intact.`,
      ru: `Мировая узнаваемость — ${d.globalPrestige}/100, и она сохраняет вес на рынке труда СНГ.`,
    },
    internationalInclusivity: {
      en: `International inclusivity scores ${d.internationalInclusivity}/100 — being an international is the norm here, not the exception.`,
      ru: `Открытость к иностранцам — ${d.internationalInclusivity}/100: быть иностранцем здесь норма, а не исключение.`,
    },
    workLifeBalance: {
      en: `Work-life balance is ${d.workLifeBalance}/100, unusually humane for a university funding students in full.`,
      ru: `Баланс учёбы и жизни — ${d.workLifeBalance}/100, что необычно гуманно для вуза с полным финансированием.`,
    },
  };
  pros.push(strengthCopy[strongest]);

  return pros.slice(0, 3);
}

function buildTradeoffs(
  record: QualitativeRecord,
  university: University,
  profile: UserProfile,
): Bilingual[] {
  const tradeoffs: Bilingual[] = [];
  const d = record.dimensions;

  // 1. Stress, stated without euphemism.
  if (record.stressIndex >= 75) {
    tradeoffs.push({
      en: `Student stress index is ${record.stressIndex}/100. The workload is genuinely punishing and the culture does not hide it.`,
      ru: `Индекс стресса — ${record.stressIndex}/100. Нагрузка действительно тяжёлая, и культура этого не скрывает.`,
    });
  } else if (d.academicIntensity < 75 && profile.ecTier === "Olympiads/Research") {
    tradeoffs.push({
      en: `Academic intensity is ${d.academicIntensity}/100. Coming from olympiad-level work, you may find the ceiling lower than you want.`,
      ru: `Академическая интенсивность — ${d.academicIntensity}/100. После олимпиадного уровня потолок может показаться низким.`,
    });
  } else {
    tradeoffs.push({
      en: `Work-life balance sits at ${d.workLifeBalance}/100 — plan for the terms where that number is tested.`,
      ru: `Баланс учёбы и жизни — ${d.workLifeBalance}/100: рассчитывайте на семестры, когда он проверяется на прочность.`,
    });
  }

  // 2. The weakest dimension that actually matters to this student.
  const weakest = VIBE_DIMENSIONS.reduce((worst, dimension) =>
    d[dimension] < d[worst] ? dimension : worst,
  );
  const weakCopy: Record<VibeDimension, Bilingual> = {
    academicIntensity: {
      en: `Academic intensity is the lowest of the five dimensions at ${d.academicIntensity}/100.`,
      ru: `Академическая интенсивность — самый низкий из пяти показателей: ${d.academicIntensity}/100.`,
    },
    collaboration: {
      en: `Collaboration scores ${d.collaboration}/100; expect a more individual, competitive rhythm.`,
      ru: `Сотрудничество — ${d.collaboration}/100: ритм будет скорее индивидуальным и конкурентным.`,
    },
    globalPrestige: {
      en: `Global name recognition is ${d.globalPrestige}/100 — you will explain this university to employers back home.`,
      ru: `Узнаваемость — ${d.globalPrestige}/100: работодателям дома придётся объяснять, что это за вуз.`,
    },
    internationalInclusivity: {
      en: `International inclusivity is ${d.internationalInclusivity}/100, the weakest of the five here.`,
      ru: `Открытость к иностранцам — ${d.internationalInclusivity}/100, самый слабый из пяти показателей.`,
    },
    workLifeBalance: {
      en: `Work-life balance is ${d.workLifeBalance}/100 and is the clearest cost of attending.`,
      ru: `Баланс учёбы и жизни — ${d.workLifeBalance}/100, и это самая очевидная цена обучения здесь.`,
    },
  };
  if (weakCopy[weakest].en !== tradeoffs[0]?.en) tradeoffs.push(weakCopy[weakest]);

  // Guarantee two trade-offs; an empty-state list is a dead end.
  if (tradeoffs.length < 2) {
    tradeoffs.push({
      en: `${university.name} funds the full cost, but acceptance remains the gate — treat the culture fit as secondary to the odds.`,
      ru: `${university.name} покрывает полную стоимость, но поступление остаётся барьером — культурное соответствие вторично по отношению к шансам.`,
    });
  }

  return tradeoffs.slice(0, 2);
}

/**
 * Mode B. Deterministic, offline, and always available — the feature must work
 * with no API key, no network, and no quota.
 */
export function evaluateQualitativeFallback(
  university: University,
  profile: UserProfile,
): VibeCheck {
  const record = getQualitativeRecord(university.id);

  if (!record) {
    // A university with no qualitative entry still gets a usable, honest card.
    const neutral: Record<VibeDimension, number> = {
      academicIntensity: 70,
      collaboration: 70,
      globalPrestige: 60,
      internationalInclusivity: 75,
      workLifeBalance: 65,
    };
    return {
      universityId: university.id,
      source: "fallback",
      vibeMatchIndex: 70,
      dimensions: neutral,
      stressIndex: 65,
      feeder: { tech: 60, quant: 60, gradSchool: 65, alumniLeverage: 60 },
      cisInclusion: {
        level: "moderate",
        en: "No qualitative profile recorded yet for this university.",
        ru: "Качественный профиль для этого вуза пока не составлен.",
      },
      pulse: [
        {
          en: `${university.name} is listed for its ${university.fundingType} commitment; culture data is still being gathered.`,
          ru: `${university.name} включён из-за обязательства «${university.fundingType}»; данные о культуре ещё собираются.`,
        },
      ],
      pros: [],
      tradeoffs: [],
    };
  }

  return {
    universityId: university.id,
    source: "fallback",
    vibeMatchIndex: vibeMatchIndex(record, profile),
    dimensions: record.dimensions,
    stressIndex: record.stressIndex,
    feeder: record.feeder,
    cisInclusion: record.cisInclusion,
    pulse: record.pulse,
    pros: buildPros(record, university, profile),
    tradeoffs: buildTradeoffs(record, university, profile),
  };
}

/**
 * Shape-check a Gemini response before it reaches the UI. A model reply is
 * untrusted input: anything malformed falls back rather than rendering
 * undefined into the page.
 */
export function isValidVibeCheck(value: unknown): value is Omit<VibeCheck, "source"> {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  const dims = v.dimensions as Record<string, unknown> | undefined;
  if (!dims || typeof dims !== "object") return false;
  if (!VIBE_DIMENSIONS.every((d) => typeof dims[d] === "number")) return false;
  if (typeof v.vibeMatchIndex !== "number") return false;
  const bilingualList = (x: unknown) =>
    Array.isArray(x) &&
    x.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as Bilingual).en === "string" &&
        typeof (item as Bilingual).ru === "string",
    );
  return bilingualList(v.pros) && bilingualList(v.tradeoffs) && bilingualList(v.pulse);
}
