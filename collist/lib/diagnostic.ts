import {
  normalizeGpa,
  type Activity,
  type EcTier,
  type GradeLevel,
  type Honor,
  type HonorLevel,
  type UserProfile,
} from "@/context/UserContext";

export type InsightKind = "strength" | "gap" | "action";

export type Insight = {
  id: string;
  kind: InsightKind;
  en: string;
  ru: string;
};

export type Bilingual = { en: string; ru: string };

export type ProfileDiagnostic = {
  /** 4.0-equivalent used by every calculation below. */
  normalizedGpa: number;
  /** What the student should see, e.g. "4.80 / 5.0". */
  displayGpa: string;
  academicFitnessScore: number;
  testingReadinessScore: number;
  ecImpactScore: number;
  fullAidIndex: number;
  startingPointIndex: number;
  /** True when the testing score is a neutral placeholder, not a real result. */
  testingNeutral: boolean;
  /** True when a real score could still raise the profile. */
  testingPotentialUnlocked: boolean;
  testOptionalStrategy: boolean;
  activityCount: number;
  honorCount: number;
  tierDistribution: Record<EcTier, number>;
  honorDistribution: Record<HonorLevel, number>;
  season: Bilingual;
  insights: Insight[];
};

const clamp = (value: number, min = 0, max = 100) =>
  Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min;

const round = (value: number) => Math.round(clamp(value));

/** How much of the academic record is complete and verifiable by this grade. */
const RECORD_COMPLETENESS: Record<GradeLevel, number> = {
  "10th": 0.5,
  "11th": 0.8,
  "12th": 1,
  "gap-year": 1,
};

const TIER_WEIGHT: Record<EcTier, number> = {
  "Olympiads/Research": 12,
  "Leadership/Projects": 8,
  "Community/Varsity": 5,
};

const HONOR_WEIGHT: Record<HonorLevel, number> = {
  International: 10,
  National: 7,
  Regional: 4,
  School: 2,
};

/** Each additional entry is worth less than the one before it. */
const DECAY = 0.82;

/** Score bands where an English test stops being a limiting factor. */
const ENGLISH_TARGET: Record<UserProfile["englishTest"], { floor: number; target: number }> = {
  IELTS: { floor: 4.5, target: 7.5 },
  TOEFL: { floor: 45, target: 105 },
  Duolingo: { floor: 60, target: 130 },
};

function academicFitness(normalizedGpa: number, gradeLevel: GradeLevel): number {
  const gpaComponent = (normalizedGpa / 4) * 85;
  const completeness = RECORD_COMPLETENESS[gradeLevel] ?? 0.8;
  return round(gpaComponent + completeness * 15);
}

function satComponent(score: number): number {
  // 900 is the practical floor for full-funding pools, 1550 the ceiling.
  return clamp(((score - 900) / (1550 - 900)) * 100);
}

function englishComponent(score: number, test: UserProfile["englishTest"]): number {
  const { floor, target } = ENGLISH_TARGET[test] ?? ENGLISH_TARGET.IELTS;
  return clamp(((score - floor) / (target - floor)) * 100);
}

/**
 * A missing test is not a zero. An unsubmitted score says nothing about the
 * student, so the profile sits at a neutral band (65–75) weighted slightly by
 * academic strength rather than being driven to the floor.
 */
function neutralTestingScore(normalizedGpa: number): number {
  return round(65 + (clamp(normalizedGpa, 0, 4) / 4) * 10);
}

function testingReadiness(profile: UserProfile, normalizedGpa: number) {
  const neutral = neutralTestingScore(normalizedGpa);

  const hasSat = profile.satStatus === "taken" && typeof profile.satScore === "number";
  const hasEnglish =
    profile.englishStatus === "taken" && typeof profile.englishScore === "number";

  const parts: number[] = [];
  if (hasSat) parts.push(satComponent(profile.satScore as number));
  if (hasEnglish) parts.push(englishComponent(profile.englishScore as number, profile.englishTest));

  // Each missing half falls back to neutral instead of dragging the average down.
  while (parts.length < 2) parts.push(neutral);

  const score = round(parts.reduce((sum, value) => sum + value, 0) / parts.length);

  return {
    score,
    testingNeutral: !hasSat && !hasEnglish,
    testingPotentialUnlocked: !hasSat || !hasEnglish,
    testOptionalStrategy: profile.satStatus === "optional",
  };
}

/** Entries with a real role and description read as substantive, not padding. */
function substanceBonus(activity: Activity): number {
  let bonus = 0;
  if (activity.role.trim().length > 0) bonus += 1;
  if (activity.description.trim().length >= 40) bonus += 2;
  return bonus;
}

function decayedSum(values: number[]): number {
  return [...values]
    .sort((a, b) => b - a)
    .reduce((total, value, index) => total + value * DECAY ** index, 0);
}

function ecImpact(activities: Activity[], honors: Honor[]): number {
  const activityPoints = decayedSum(
    activities.map((activity) => TIER_WEIGHT[activity.tier] + substanceBonus(activity)),
  );
  const honorPoints = decayedSum(honors.map((honor) => HONOR_WEIGHT[honor.level]));
  return round(activityPoints + honorPoints);
}

function distribution<T extends string>(
  items: readonly { key: T }[],
  keys: readonly T[],
): Record<T, number> {
  const counts = Object.fromEntries(keys.map((key) => [key, 0])) as Record<T, number>;
  for (const item of items) counts[item.key] += 1;
  return counts;
}

/**
 * Entry year the student is currently working toward. From August onward the
 * current 12th-grade cohort is applying for the following autumn.
 */
function applicationSeason(gradeLevel: GradeLevel, now: Date): Bilingual {
  const year = now.getFullYear();
  const cycleBase = now.getMonth() >= 7 ? year + 1 : year;
  const yearsOut: Record<GradeLevel, number> = {
    "12th": 0,
    "gap-year": 0,
    "11th": 1,
    "10th": 2,
  };
  const entry = cycleBase + (yearsOut[gradeLevel] ?? 0);
  return { en: `Fall ${entry} entry`, ru: `Поступление осенью ${entry}` };
}

function buildInsights(
  profile: UserProfile,
  scores: {
    normalizedGpa: number;
    academic: number;
    testing: ReturnType<typeof testingReadiness>;
    ec: number;
    fullAid: number;
  },
): Insight[] {
  const insights: Insight[] = [];
  const { normalizedGpa, testing, ec, fullAid } = scores;

  // --- Grade-adaptive next action -------------------------------------------
  const gradeAction: Record<GradeLevel, Bilingual> = {
    "10th": {
      en: "You are early enough that trajectory beats scores. Hold the GPA line, sit the PSAT as a diagnostic, and enter one subject olympiad this year — national placement is the single highest-leverage thing a 10th grader can bank.",
      ru: "Вы достаточно рано, чтобы траектория была важнее баллов. Держите GPA, сдайте PSAT как диагностику и участвуйте в одной предметной олимпиаде — национальное призовое место даёт десятикласснику наибольший рычаг.",
    },
    "11th": {
      en: "This is the decisive year. Lock a spring SAT or IELTS date now, and convert your strongest activity into a measurable result before applications open in August.",
      ru: "Это решающий год. Зафиксируйте дату SAT или IELTS на весну и превратите самую сильную активность в измеримый результат до открытия подачи в августе.",
    },
    "12th": {
      en: "Execution window, not building window. Prioritise essay drafts and the CSS Profile or ISFAA over another test attempt — aid forms miss more full-ride offers than low scores do.",
      ru: "Сейчас окно исполнения, а не набора. Приоритет — черновики эссе и CSS Profile или ISFAA, а не ещё одна попытка теста: из-за форм на помощь теряется больше полных грантов, чем из-за низких баллов.",
    },
    "gap-year": {
      en: "Rebuild the half of last cycle that failed, not the half that worked. If you were rejected with strong scores, the gap was almost certainly funding strategy or essays — re-run the school list before rewriting anything.",
      ru: "Перестраивайте ту половину прошлого цикла, которая не сработала, а не ту, которая сработала. Если отказали при сильных баллах, дело почти наверняка в стратегии финансирования или эссе — сначала пересоберите список вузов.",
    },
  };
  insights.push({ id: "grade-action", kind: "action", ...gradeAction[profile.gradeLevel] });

  // --- Academics -------------------------------------------------------------
  if (normalizedGpa >= 3.85) {
    insights.push({
      id: "gpa-strong",
      kind: "strength",
      en: `A ${normalizedGpa.toFixed(2)} equivalent clears the academic bar at every need-blind university in the dataset. Academics are not your limiting factor.`,
      ru: `Эквивалент ${normalizedGpa.toFixed(2)} проходит академическую планку всех need-blind университетов в базе. Академика — не ваше ограничение.`,
    });
  } else if (normalizedGpa < 3.3) {
    insights.push({
      id: "gpa-gap",
      kind: "gap",
      en: `At a ${normalizedGpa.toFixed(2)} equivalent, US need-blind admission is a long shot, but full-tuition guarantees in Asia and Europe stay well within range. Weight your list that way.`,
      ru: `С эквивалентом ${normalizedGpa.toFixed(2)} поступление в need-blind вузы США маловероятно, но полное покрытие обучения в Азии и Европе вполне достижимо. Стройте список соответственно.`,
    });
  }

  // --- Testing ---------------------------------------------------------------
  if (testing.testOptionalStrategy) {
    insights.push({
      id: "test-optional",
      kind: "action",
      en: "Test-optional is scored neutrally here, not as a penalty. It does narrow the need-blind US pool, so let your activities and essays carry more of the case.",
      ru: "Подача без тестов оценивается нейтрально, а не как штраф. Но круг need-blind вузов США сужается, поэтому пусть активности и эссе возьмут больше нагрузки.",
    });
  } else if (testing.testingNeutral) {
    insights.push({
      id: "testing-unlocked",
      kind: "action",
      en: "No scores logged yet, so testing sits at a neutral baseline rather than zero. A 1450+ SAT or 7.0+ IELTS is the fastest single lift available to this profile.",
      ru: "Баллов пока нет, поэтому тесты оценены нейтрально, а не нулём. SAT от 1450 или IELTS от 7.0 — самый быстрый способ поднять этот профиль.",
    });
  } else if (testing.testingPotentialUnlocked) {
    insights.push({
      id: "testing-partial",
      kind: "action",
      en: "Half your testing picture is filled in. Adding the missing score is worth more right now than improving the one you already have.",
      ru: "Заполнена половина картины по тестам. Добавить недостающий балл сейчас важнее, чем улучшать уже имеющийся.",
    });
  }

  // --- Activities and honours -------------------------------------------------
  if (profile.activities.length === 0) {
    insights.push({
      id: "ec-empty",
      kind: "gap",
      en: "No activities logged. Full-funding committees read depth over volume — add the two commitments you have held longest, with a concrete outcome in each description.",
      ru: "Активности не указаны. Комитеты по финансированию ценят глубину, а не количество — добавьте два самых длительных занятия с конкретным результатом в описании.",
    });
  } else {
    const tiers = profile.activities.map((activity) => activity.tier);
    const hasTopTier = tiers.includes("Olympiads/Research");
    const thin = profile.activities.filter(
      (activity) => activity.description.trim().length < 40,
    ).length;

    if (hasTopTier) {
      insights.push({
        id: "ec-top-tier",
        kind: "strength",
        en: "An olympiad or research entry sits at the top of your list. That is the profile shape full-ride merit committees fund most readily.",
        ru: "В вашем списке есть олимпиада или исследование. Именно такой профиль охотнее всего финансируют комитеты полных грантов.",
      });
    } else if (profile.activities.length >= 3) {
      insights.push({
        id: "ec-depth",
        kind: "gap",
        en: "Your activities are broad but none reach the olympiad or research tier. One measurable national-level result would move this score more than three additional entries.",
        ru: "Активности разнообразны, но ни одна не дотягивает до уровня олимпиад или исследований. Один измеримый результат национального уровня поднимет балл сильнее, чем три новые записи.",
      });
    }

    if (thin > 0) {
      insights.push({
        id: "ec-thin-descriptions",
        kind: "action",
        en: `${thin} ${thin === 1 ? "entry is" : "entries are"} missing a substantive description. State what changed because you were there — a number, a size, an outcome.`,
        ru: `${thin} ${thin === 1 ? "запись" : "записей"} без содержательного описания. Укажите, что изменилось благодаря вам — цифру, масштаб, результат.`,
      });
    }
  }

  if (profile.honors.length === 0 && profile.activities.length > 0) {
    insights.push({
      id: "honors-empty",
      kind: "action",
      en: "No honours listed. School-level awards still count here — they establish a pattern of recognition even when nothing international exists yet.",
      ru: "Награды не указаны. Школьные тоже учитываются — они показывают закономерность признания, даже если международных пока нет.",
    });
  } else if (profile.honors.some((honor) => honor.level === "International")) {
    insights.push({
      id: "honors-international",
      kind: "strength",
      en: "An international award is the strongest single signal in this profile. Lead with it in every essay and short-answer prompt.",
      ru: "Международная награда — самый сильный сигнал в профиле. Начинайте с неё в каждом эссе и коротком ответе.",
    });
  }

  // --- Funding readiness ------------------------------------------------------
  if (fullAid >= 75) {
    insights.push({
      id: "aid-strong",
      kind: "strength",
      en: "This profile is competitive for 100% need-blind and full-ride pools. Apply to a genuine spread — two safeties that guarantee full tuition, not eight reaches.",
      ru: "Профиль конкурентоспособен для need-blind и полных грантов. Подавайтесь с реальным разбросом: два надёжных варианта с гарантированным покрытием, а не восемь мечт.",
    });
  } else if (fullAid < 45) {
    insights.push({
      id: "aid-early",
      kind: "gap",
      en: "Full-ride readiness is still early-stage. Anchor the list on guaranteed full-tuition institutions where admission, not selection odds, decides your funding.",
      ru: "Готовность к полным грантам пока на раннем этапе. Стройте список вокруг вузов с гарантированным покрытием обучения, где финансирование решается фактом поступления, а не конкурсом.",
    });
  }

  if (ec >= 70 && normalizedGpa < 3.5) {
    insights.push({
      id: "ec-carries",
      kind: "strength",
      en: "Your record outperforms your transcript. Target universities that read applications holistically rather than filtering on GPA first.",
      ru: "Ваш послужной список сильнее аттестата. Выбирайте вузы с целостной оценкой заявок, а не с первичным отбором по GPA.",
    });
  }

  if (profile.preferredRegions.length > 0) {
    insights.push({
      id: "regions-weighted",
      kind: "action",
      en: `${profile.preferredRegions.join(", ")} will rank higher, but no fully funded university is hidden because of that choice.`,
      ru: `${profile.preferredRegions.join(", ")} получат более высокий приоритет, но ни один вуз с полным финансированием не скрывается из-за этого выбора.`,
    });
  }

  return insights;
}

/**
 * Point A baseline. Pure: identical input yields identical output, and `now`
 * is injectable so the application-season badge is deterministic under test.
 */
export function calculateProfileDiagnostic(
  profile: UserProfile,
  now: Date = new Date(),
): ProfileDiagnostic {
  const normalizedGpa = normalizeGpa(profile.gpaRaw ?? 0, profile.gpaScale ?? 4);

  // Normalise the collections once, up front. Everything downstream — scoring
  // and narrative alike — reads this, so a profile missing an array cannot
  // reach a `.length` and throw.
  const activities = profile.activities ?? [];
  const honors = profile.honors ?? [];
  const safe: UserProfile = {
    ...profile,
    activities,
    honors,
    preferredRegions: profile.preferredRegions ?? [],
  };

  const academic = academicFitness(normalizedGpa, safe.gradeLevel);
  const testing = testingReadiness(safe, normalizedGpa);
  const ec = ecImpact(activities, honors);

  // Full-aid pools are hyper-selective, so the curve pushes mid-range profiles
  // down rather than letting a flat average read as "ready".
  const aidBase = 0.45 * academic + 0.2 * testing.score + 0.35 * ec;
  const fullAidIndex = round(100 * (clamp(aidBase) / 100) ** 1.18);

  const startingPointIndex = round(0.38 * academic + 0.27 * testing.score + 0.35 * ec);

  const displayGpa =
    safe.gpaScale === 5
      ? `${(safe.gpaRaw ?? 0).toFixed(2)} / 5.0`
      : `${normalizedGpa.toFixed(2)} / 4.0`;

  return {
    normalizedGpa,
    displayGpa,
    academicFitnessScore: academic,
    testingReadinessScore: testing.score,
    ecImpactScore: ec,
    fullAidIndex,
    startingPointIndex,
    testingNeutral: testing.testingNeutral,
    testingPotentialUnlocked: testing.testingPotentialUnlocked,
    testOptionalStrategy: testing.testOptionalStrategy,
    activityCount: activities.length,
    honorCount: honors.length,
    tierDistribution: distribution(
      activities.map((activity) => ({ key: activity.tier })),
      ["Olympiads/Research", "Leadership/Projects", "Community/Varsity"] as const,
    ),
    honorDistribution: distribution(
      honors.map((honor) => ({ key: honor.level })),
      ["International", "National", "Regional", "School"] as const,
    ),
    season: applicationSeason(safe.gradeLevel, now),
    insights: buildInsights(safe, {
      normalizedGpa,
      academic,
      testing,
      ec,
      fullAid: fullAidIndex,
    }),
  };
}
