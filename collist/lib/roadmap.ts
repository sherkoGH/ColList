import {
  normalizeGpa,
  type Activity,
  type GradeLevel,
  type Honor,
  type UserProfile,
} from "@/context/UserContext";
import { calculateProfileDiagnostic } from "@/lib/diagnostic";
import { calculateCollegeMatches, toIeltsEquivalent, type CollegeMatch } from "@/lib/matcher";

export type Bilingual = { en: string; ru: string };
export type PriorityTier = "Crucial" | "High Impact" | "Recommended";
export type Difficulty = "Low" | "Moderate" | "High";
export type PhaseId = 1 | 2 | 3;

export type ActionItem = {
  id: string;
  tier: PriorityTier;
  difficulty: Difficulty;
  phase: PhaseId;
  weeks: number;
  title: Bilingual;
  detail: Bilingual;
  /** Percentage-point gain, measured by simulating this change alone. */
  admissionsBoost: number;
  fundingBoost: number;
};

export type GapAnalysis = {
  gpa: { current: number; target: number; delta: number };
  sat: { current: number | null; target: number; delta: number; testOptional: boolean };
  english: { current: number | null; target: number; delta: number };
  activities: { current: number; recommended: number; topTier: number };
  honors: { current: number; hasNationalOrAbove: boolean };
};

export type Phase = {
  id: PhaseId;
  title: Bilingual;
  summary: Bilingual;
  items: ActionItem[];
};

export type Milestone = {
  id: string;
  phase: PhaseId;
  label: Bilingual;
  window: Bilingual;
};

export type DeadlineInfo = {
  roundKey: "ED" | "RD" | "NEXT";
  label: Bilingual;
  isoDate: string;
  daysRemaining: number;
};

export type StrategicRoadmap = {
  /** Current Starting Point Index. */
  pointA: number;
  /** Index the same engine returns once the roadmap is completed. */
  pointB: number;
  track: "building" | "executing";
  gaps: GapAnalysis;
  actions: ActionItem[];
  phases: Phase[];
  milestones: Milestone[];
  deadline: DeadlineInfo;
  projectedBoost: { admissions: number; funding: number };
  focusUniversityId: string | null;
};

const RECOMMENDED_ACTIVITIES = 4;

const clamp = (v: number, min = 0, max = 100) =>
  Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : min;

function safeProfile(profile: UserProfile): UserProfile {
  return {
    ...profile,
    activities: profile.activities ?? [],
    honors: profile.honors ?? [],
    preferredRegions: profile.preferredRegions ?? [],
  };
}

function makeActivity(tier: Activity["tier"], title: string): Activity {
  return {
    id: `sim-${tier}-${title}`,
    title,
    role: "Lead",
    // Long enough to clear the substance threshold the EC scorer applies.
    description: "Simulated flagship entry with a concrete, measurable outcome attached.",
    tier,
  };
}

function makeHonor(level: Honor["level"]): Honor {
  return { id: `sim-honor-${level}`, title: "Simulated award", level, gradeAwarded: "11th" };
}

/** Average admissions and funding odds across the roster, for one profile. */
function averageOdds(profile: UserProfile, targets: CollegeMatch[]) {
  const universities = targets.map((match) => match.university);
  if (universities.length === 0) return { admissions: 0, funding: 0 };

  const matches = calculateCollegeMatches(profile, universities);
  if (matches.length === 0) return { admissions: 0, funding: 0 };

  const admissions =
    matches.reduce((sum, m) => sum + m.admissionsOdds, 0) / matches.length;
  const funding = matches.reduce((sum, m) => sum + m.fundingOdds, 0) / matches.length;
  return { admissions, funding };
}

/**
 * Measure one change in isolation: apply the mutation, re-run the real match
 * engine, and report the delta. Nothing here is a hand-written estimate.
 */
function measureBoost(
  base: UserProfile,
  targets: CollegeMatch[],
  baseline: { admissions: number; funding: number },
  mutate: (p: UserProfile) => UserProfile,
) {
  const after = averageOdds(mutate(base), targets);
  return {
    admissionsBoost: Math.round(after.admissions - baseline.admissions),
    fundingBoost: Math.round(after.funding - baseline.funding),
  };
}

function analyseGaps(profile: UserProfile, targets: CollegeMatch[]): GapAnalysis {
  const unis = targets.map((t) => t.university);
  // Clearing the hardest school on the list clears the whole list.
  const gpaTarget = unis.length ? Math.max(...unis.map((u) => u.minGpa)) : 3.8;
  const satTarget = unis.length ? Math.max(...unis.map((u) => u.avgSat)) : 1500;
  const ieltsTarget = unis.length ? Math.max(...unis.map((u) => u.avgIelts)) : 7.5;

  const currentGpa = normalizeGpa(profile.gpaRaw ?? 0, profile.gpaScale ?? 4);
  const currentSat =
    profile.satStatus === "taken" && typeof profile.satScore === "number"
      ? profile.satScore
      : null;
  const currentEnglish =
    profile.englishStatus === "taken" && typeof profile.englishScore === "number"
      ? toIeltsEquivalent(profile.englishScore, profile.englishTest)
      : null;

  return {
    gpa: {
      current: currentGpa,
      target: gpaTarget,
      delta: Math.max(0, Number((gpaTarget - currentGpa).toFixed(2))),
    },
    sat: {
      current: currentSat,
      target: satTarget,
      delta: currentSat === null ? satTarget : Math.max(0, satTarget - currentSat),
      testOptional: profile.satStatus === "optional",
    },
    english: {
      current: currentEnglish,
      target: ieltsTarget,
      delta:
        currentEnglish === null
          ? ieltsTarget
          : Math.max(0, Number((ieltsTarget - currentEnglish).toFixed(1))),
    },
    activities: {
      current: profile.activities.length,
      recommended: RECOMMENDED_ACTIVITIES,
      topTier: profile.activities.filter((a) => a.tier === "Olympiads/Research").length,
    },
    honors: {
      current: profile.honors.length,
      hasNationalOrAbove: profile.honors.some(
        (h) => h.level === "International" || h.level === "National",
      ),
    },
  };
}

/** Flagship project concepts, specific enough to actually start on Monday. */
const FLAGSHIP_PROJECT: Record<string, Bilingual> = {
  cs: {
    en: "Ship one open-source tool that strangers use. A CLI or web app solving a problem in your own school system, published to GitHub with a README, tests and at least 50 stars or 200 real users — not a tutorial clone.",
    ru: "Выпустите один open-source инструмент, которым пользуются незнакомые люди. CLI или веб-приложение для реальной проблемы вашей школьной системы: GitHub, README, тесты и минимум 50 звёзд или 200 живых пользователей — не копия из туториала.",
  },
  engineering: {
    en: "Build one physical prototype that measurably works: a low-cost sensor rig, water-quality monitor or assistive device. Document the iteration log and the failure modes — committees read the engineering process, not the render.",
    ru: "Соберите один физический прототип с измеримым результатом: недорогой сенсорный стенд, монитор качества воды или ассистивное устройство. Фиксируйте журнал итераций и отказы — комитеты читают инженерный процесс, а не рендер.",
  },
  sciences: {
    en: "Produce one independent research paper with a named mentor and submit it to a student journal or an arXiv preprint. A replication study with clean methodology beats an ambitious project you cannot finish.",
    ru: "Подготовьте одну самостоятельную исследовательскую работу с научным руководителем и подайте её в студенческий журнал или как препринт на arXiv. Репликация с чистой методологией лучше амбициозного незавершённого проекта.",
  },
  business: {
    en: "Run one venture with real numbers attached: revenue, users or capital raised. A market analysis of your region's full-aid education gap, published with data, outperforms an unlaunched startup deck.",
    ru: "Запустите одно предприятие с реальными цифрами: выручка, пользователи или привлечённый капитал. Опубликованный анализ рынка образования в вашем регионе с данными сильнее презентации незапущенного стартапа.",
  },
  humanities: {
    en: "Publish one substantial piece of work — an essay in a recognised journal, a translated anthology, or an oral-history archive of your region — and expand one existing initiative to a second city.",
    ru: "Опубликуйте одну серьёзную работу — эссе в признанном журнале, переводную антологию или архив устной истории вашего региона — и расширьте одну существующую инициативу на второй город.",
  },
};

const DEFAULT_PROJECT: Bilingual = {
  en: "Choose one flagship commitment and take it to a measurable outcome. Depth in a single project reads stronger than five shallow entries.",
  ru: "Выберите одно флагманское направление и доведите его до измеримого результата. Глубина в одном проекте читается сильнее пяти поверхностных записей.",
};

const COMPETITION_TARGET: Record<string, Bilingual> = {
  cs: {
    en: "Target a national informatics olympiad placement or a top-three finish at a recognised international hackathon. Both are verifiable and both travel across borders.",
    ru: "Нацельтесь на призовое место в национальной олимпиаде по информатике или топ-3 на признанном международном хакатоне. И то, и другое проверяемо и признаётся за рубежом.",
  },
  engineering: {
    en: "Enter a national engineering or robotics olympiad. A team placement with a documented individual contribution is the strongest realistic target this cycle.",
    ru: "Участвуйте в национальной олимпиаде по инженерии или робототехнике. Командное призовое место с задокументированным личным вкладом — самая реалистичная сильная цель.",
  },
  sciences: {
    en: "Target a national subject olympiad in physics, chemistry or biology, then use the placement to secure a university lab attachment.",
    ru: "Нацельтесь на национальную предметную олимпиаду по физике, химии или биологии, а затем используйте результат, чтобы попасть в университетскую лабораторию.",
  },
  business: {
    en: "Compete in a national economics olympiad or an international case competition. Case wins are unusually legible to admissions readers outside your country.",
    ru: "Участвуйте в национальной олимпиаде по экономике или международном кейс-чемпионате. Победы в кейсах особенно понятны читателям заявок за рубежом.",
  },
  humanities: {
    en: "Target a national essay or debate championship, or a recognised translation prize. Language-based awards port directly into your application writing.",
    ru: "Нацельтесь на национальный чемпионат по эссе или дебатам либо признанную переводческую премию. Языковые награды напрямую усиливают тексты заявки.",
  },
};

const DEFAULT_COMPETITION: Bilingual = {
  en: "Enter one national-level competition in your strongest subject this cycle. A placement converts an unverified interest into a checkable credential.",
  ru: "Участвуйте в одном соревновании национального уровня по вашему сильнейшему предмету в этом цикле. Призовое место превращает заявленный интерес в проверяемое достижение.",
};

function tierFor(total: number, forced?: PriorityTier): PriorityTier {
  if (forced) return forced;
  if (total >= 8) return "Crucial";
  if (total >= 4) return "High Impact";
  return "Recommended";
}

/**
 * Application deadline the student is actually working toward.
 * Standard US cycle dates; not per-school verified, hence the Demo Data badge.
 */
function nextDeadline(gradeLevel: GradeLevel, now: Date): DeadlineInfo {
  const year = now.getFullYear();
  const applyingThisCycle = gradeLevel === "12th" || gradeLevel === "gap-year";

  const days = (target: Date) =>
    Math.max(0, Math.ceil((target.getTime() - now.getTime()) / 86_400_000));

  if (applyingThisCycle) {
    // From August the current cycle is live: ED/EA on 1 Nov, RD on 1 Jan.
    const cycleYear = now.getMonth() >= 7 ? year : year - 1;
    const ed = new Date(Date.UTC(cycleYear, 10, 1));
    if (ed.getTime() > now.getTime()) {
      return {
        roundKey: "ED",
        label: { en: "Early Decision / Early Action", ru: "Early Decision / Early Action" },
        isoDate: ed.toISOString().slice(0, 10),
        daysRemaining: days(ed),
      };
    }
    const rd = new Date(Date.UTC(cycleYear + 1, 0, 1));
    return {
      roundKey: "RD",
      label: { en: "Regular Decision", ru: "Regular Decision" },
      isoDate: rd.toISOString().slice(0, 10),
      daysRemaining: days(rd),
    };
  }

  // 10th and 11th graders are working toward a future cycle's ED date.
  const yearsOut = gradeLevel === "11th" ? 1 : 2;
  const base = now.getMonth() >= 7 ? year : year - 1;
  const future = new Date(Date.UTC(base + yearsOut, 10, 1));
  return {
    roundKey: "NEXT",
    label: { en: "First applications open", ru: "Открытие первой подачи" },
    isoDate: future.toISOString().slice(0, 10),
    daysRemaining: days(future),
  };
}

function buildMilestones(gradeLevel: GradeLevel, deadline: DeadlineInfo): Milestone[] {
  const byGrade: Record<GradeLevel, Milestone[]> = {
    "10th": [
      { id: "m-psat", phase: 1, label: { en: "Sit the PSAT as a diagnostic", ru: "Сдать PSAT как диагностику" }, window: { en: "This autumn", ru: "Этой осенью" } },
      { id: "m-gpa", phase: 1, label: { en: "Hold the GPA line through two full years", ru: "Удержать GPA два полных года" }, window: { en: "Ongoing", ru: "Постоянно" } },
      { id: "m-project", phase: 2, label: { en: "Start the flagship project", ru: "Начать флагманский проект" }, window: { en: "Within 3 months", ru: "В течение 3 месяцев" } },
      { id: "m-olympiad", phase: 2, label: { en: "First olympiad attempt", ru: "Первая попытка на олимпиаде" }, window: { en: "This academic year", ru: "В этом учебном году" } },
      { id: "m-shortlist", phase: 3, label: { en: "Draft a funded shortlist", ru: "Составить список вузов с финансированием" }, window: { en: "Grade 11 autumn", ru: "Осень 11 класса" } },
    ],
    "11th": [
      { id: "m-testdate", phase: 1, label: { en: "Book the spring SAT and IELTS dates", ru: "Забронировать даты SAT и IELTS на весну" }, window: { en: "Within 4 weeks", ru: "В течение 4 недель" } },
      { id: "m-scores", phase: 1, label: { en: "Clear the target score bands", ru: "Достичь целевых баллов" }, window: { en: "By June", ru: "К июню" } },
      { id: "m-flagship", phase: 2, label: { en: "Flagship project reaches a public outcome", ru: "Флагманский проект даёт публичный результат" }, window: { en: "By August", ru: "К августу" } },
      { id: "m-honor", phase: 2, label: { en: "National-level recognition attempt", ru: "Попытка признания национального уровня" }, window: { en: "This academic year", ru: "В этом учебном году" } },
      { id: "m-essays", phase: 3, label: { en: "First Common App essay draft", ru: "Первый черновик эссе Common App" }, window: { en: "Summer before grade 12", ru: "Лето перед 12 классом" } },
    ],
    "12th": [
      { id: "m-lock", phase: 1, label: { en: "Lock scores — no new test attempts", ru: "Зафиксировать баллы — без новых попыток" }, window: { en: "Now", ru: "Сейчас" } },
      { id: "m-recs", phase: 2, label: { en: "Confirm recommenders and brief them", ru: "Подтвердить рекомендателей и ввести их в курс" }, window: { en: "Within 2 weeks", ru: "В течение 2 недель" } },
      { id: "m-ed", phase: 3, label: { en: "Submit Early Decision / Early Action", ru: "Подать Early Decision / Early Action" }, window: { en: `${deadline.daysRemaining} days`, ru: `${deadline.daysRemaining} дн.` } },
      { id: "m-css", phase: 3, label: { en: "File CSS Profile and ISFAA", ru: "Подать CSS Profile и ISFAA" }, window: { en: "With each application", ru: "С каждой заявкой" } },
      { id: "m-rd", phase: 3, label: { en: "Submit Regular Decision round", ru: "Подать Regular Decision" }, window: { en: "1 January", ru: "1 января" } },
    ],
    "gap-year": [
      { id: "m-audit", phase: 1, label: { en: "Audit last cycle: which half failed", ru: "Разобрать прошлый цикл: что не сработало" }, window: { en: "Week 1", ru: "Неделя 1" } },
      { id: "m-relist", phase: 1, label: { en: "Rebuild the school list around funding", ru: "Пересобрать список вузов вокруг финансирования" }, window: { en: "Within 3 weeks", ru: "В течение 3 недель" } },
      { id: "m-evidence", phase: 2, label: { en: "Add one verifiable result from the gap year", ru: "Добавить один проверяемый результат за gap year" }, window: { en: "Before submission", ru: "До подачи" } },
      { id: "m-essays", phase: 3, label: { en: "Rewrite essays around the gap-year evidence", ru: "Переписать эссе вокруг результатов gap year" }, window: { en: "Within 6 weeks", ru: "В течение 6 недель" } },
      { id: "m-css", phase: 3, label: { en: "File CSS Profile and ISFAA", ru: "Подать CSS Profile и ISFAA" }, window: { en: "With each application", ru: "С каждой заявкой" } },
    ],
  };
  return byGrade[gradeLevel] ?? byGrade["11th"];
}

const PHASE_META: Record<PhaseId, { title: Bilingual; summary: Bilingual }> = {
  1: {
    title: { en: "Phase 1 — Academic & testing thresholds", ru: "Фаза 1 — Академика и тесты" },
    summary: {
      en: "Clear the numeric bars that filter applications before a human reads them.",
      ru: "Пройдите числовые пороги, по которым заявки отсеиваются до чтения человеком.",
    },
  },
  2: {
    title: { en: "Phase 2 — Flagship projects & honors", ru: "Фаза 2 — Флагманские проекты и награды" },
    summary: {
      en: "Convert interests into verifiable outcomes. This is where full-ride decisions are actually made.",
      ru: "Превратите интересы в проверяемые результаты. Именно здесь решаются полные гранты.",
    },
  },
  3: {
    title: { en: "Phase 3 — Application & aid execution", ru: "Фаза 3 — Подача и финансовая помощь" },
    summary: {
      en: "Aid paperwork loses more full-ride offers than low scores do. Treat it as a deadline, not an afterthought.",
      ru: "Из-за документов на помощь теряется больше полных грантов, чем из-за низких баллов. Это дедлайн, а не формальность.",
    },
  },
};

/**
 * Bridge Point A to Point B.
 *
 * Every percentage in the result is measured, not asserted: each action is
 * simulated against the real match engine and the delta is reported.
 */
export function generateStrategicRoadmap(
  userProfile: UserProfile,
  targetColleges: CollegeMatch[],
  options: { now?: Date; focusUniversityId?: string | null } = {},
): StrategicRoadmap {
  const now = options.now ?? new Date();
  const profile = safeProfile(userProfile);

  const focusUniversityId = options.focusUniversityId ?? null;
  const scope = focusUniversityId
    ? targetColleges.filter((m) => m.university.id === focusUniversityId)
    : targetColleges;
  const targets = scope.length > 0 ? scope : targetColleges;

  const gaps = analyseGaps(profile, targets);
  const baseline = averageOdds(profile, targets);
  const diagnostic = calculateProfileDiagnostic(profile, now);

  const gpaRawTarget =
    profile.gpaScale === 5 ? Math.min(5, gaps.gpa.target + 1) : gaps.gpa.target;

  const withGpa = (p: UserProfile): UserProfile => ({ ...p, gpaRaw: gpaRawTarget, gpa: gaps.gpa.target });
  const withSat = (p: UserProfile): UserProfile => ({ ...p, satStatus: "taken", satScore: gaps.sat.target });
  const withEnglish = (p: UserProfile): UserProfile => ({
    ...p,
    englishStatus: "taken",
    englishTest: "IELTS",
    englishScore: gaps.english.target,
  });
  const withProject = (p: UserProfile): UserProfile => ({
    ...p,
    activities: [...p.activities, makeActivity("Olympiads/Research", "flagship")],
    ecTier: "Olympiads/Research",
  });
  const withHonor = (p: UserProfile): UserProfile => ({ ...p, honors: [...p.honors, makeHonor("National")] });
  const withDepth = (p: UserProfile): UserProfile => ({
    ...p,
    activities: [
      ...p.activities,
      ...Array.from({ length: Math.max(0, RECOMMENDED_ACTIVITIES - p.activities.length) }, (_, i) =>
        makeActivity("Leadership/Projects", `depth-${i}`),
      ),
    ],
  });

  const actions: ActionItem[] = [];
  const track: StrategicRoadmap["track"] =
    profile.gradeLevel === "12th" || profile.gradeLevel === "gap-year" ? "executing" : "building";

  // --- Phase 1: academics and testing -------------------------------------
  if (gaps.gpa.delta > 0.05) {
    const boost = measureBoost(profile, targets, baseline, withGpa);
    actions.push({
      id: "gpa",
      tier: tierFor(boost.admissionsBoost + boost.fundingBoost),
      difficulty: gaps.gpa.delta > 0.4 ? "High" : "Moderate",
      phase: 1,
      weeks: 24,
      title: {
        en: `Raise GPA by ${gaps.gpa.delta.toFixed(2)} to ${gaps.gpa.target.toFixed(2)}`,
        ru: `Поднять GPA на ${gaps.gpa.delta.toFixed(2)} до ${gaps.gpa.target.toFixed(2)}`,
      },
      detail: {
        en: `The hardest school on your list expects ${gaps.gpa.target.toFixed(2)}. Concentrate on the two subjects where a single grade band moves the average most — a broad effort across every class moves it slowest.`,
        ru: `Самый требовательный вуз в списке ожидает ${gaps.gpa.target.toFixed(2)}. Сосредоточьтесь на двух предметах, где одна оценка сильнее всего двигает средний балл — равномерные усилия по всем предметам работают медленнее всего.`,
      },
      ...boost,
    });
  }

  if (gaps.sat.testOptional) {
    const boost = measureBoost(profile, targets, baseline, withSat);
    actions.push({
      id: "test-optional",
      tier: tierFor(boost.admissionsBoost + boost.fundingBoost),
      difficulty: "Moderate",
      phase: 1,
      weeks: 12,
      title: {
        en: "Re-examine the test-optional decision",
        ru: "Пересмотреть решение подаваться без тестов",
      },
      detail: {
        en: `Test-optional is scored neutrally here, not penalised. But a ${gaps.sat.target} SAT would measurably change this roster — sit one practice test before committing to the strategy.`,
        ru: `Подача без тестов оценивается нейтрально, а не штрафуется. Но SAT ${gaps.sat.target} заметно изменил бы этот список — сдайте один пробный тест, прежде чем закрепить стратегию.`,
      },
      ...boost,
    });
  } else if (gaps.sat.delta > 0) {
    const boost = measureBoost(profile, targets, baseline, withSat);
    actions.push({
      id: "sat",
      tier: tierFor(boost.admissionsBoost + boost.fundingBoost),
      difficulty: gaps.sat.delta > 150 ? "High" : "Moderate",
      phase: 1,
      weeks: gaps.sat.current === null ? 16 : 10,
      title: {
        en:
          gaps.sat.current === null
            ? `Sit the SAT and target ${gaps.sat.target}`
            : `Raise SAT by ${gaps.sat.delta} to ${gaps.sat.target}`,
        ru:
          gaps.sat.current === null
            ? `Сдать SAT с целью ${gaps.sat.target}`
            : `Поднять SAT на ${gaps.sat.delta} до ${gaps.sat.target}`,
      },
      detail: {
        en: `${gaps.sat.target} is the benchmark at the most selective school on your list. Full-length timed sections under real conditions move scores; untimed drilling does not.`,
        ru: `${gaps.sat.target} — ориентир самого селективного вуза в списке. Баллы двигают полноформатные секции на время в реальных условиях, а не разбор задач без таймера.`,
      },
      ...boost,
    });
  }

  if (gaps.english.delta > 0) {
    const boost = measureBoost(profile, targets, baseline, withEnglish);
    actions.push({
      id: "english",
      tier: tierFor(boost.admissionsBoost + boost.fundingBoost),
      difficulty: gaps.english.delta > 1 ? "Moderate" : "Low",
      phase: 1,
      weeks: 8,
      title: {
        en:
          gaps.english.current === null
            ? `Sit IELTS and target ${gaps.english.target.toFixed(1)}`
            : `Raise English to ${gaps.english.target.toFixed(1)} IELTS`,
        ru:
          gaps.english.current === null
            ? `Сдать IELTS с целью ${gaps.english.target.toFixed(1)}`
            : `Поднять английский до ${gaps.english.target.toFixed(1)} IELTS`,
      },
      detail: {
        en: "English is the cheapest gap on this list to close and the one that blocks visa and aid paperwork if left late. Writing is almost always the limiting band.",
        ru: "Английский — самый дешёвый пробел в этом списке и тот, который блокирует визу и документы на помощь, если оставить его на потом. Ограничивает почти всегда письмо.",
      },
      ...boost,
    });
  }

  // --- Phase 2: flagship work and recognition ------------------------------
  if (gaps.activities.topTier === 0) {
    const boost = measureBoost(profile, targets, baseline, withProject);
    actions.push({
      id: "flagship",
      tier: tierFor(boost.admissionsBoost + boost.fundingBoost, track === "building" ? "Crucial" : undefined),
      difficulty: "High",
      phase: 2,
      weeks: track === "building" ? 20 : 8,
      title: { en: "Build one flagship project", ru: "Создать один флагманский проект" },
      detail: FLAGSHIP_PROJECT[profile.majorInterest] ?? DEFAULT_PROJECT,
      ...boost,
    });
  }

  if (gaps.activities.current < RECOMMENDED_ACTIVITIES) {
    const boost = measureBoost(profile, targets, baseline, withDepth);
    actions.push({
      id: "depth",
      tier: tierFor(boost.admissionsBoost + boost.fundingBoost),
      difficulty: "Moderate",
      phase: 2,
      weeks: 12,
      title: {
        en: `Log ${RECOMMENDED_ACTIVITIES - gaps.activities.current} more substantive activities`,
        ru: `Добавить ещё ${RECOMMENDED_ACTIVITIES - gaps.activities.current} содержательных активностей`,
      },
      detail: {
        en: "Each entry needs a number attached — people reached, funds raised, code shipped. An activity without a measurable outcome scores as an interest, not a credential.",
        ru: "К каждой записи нужна цифра — охват, собранные средства, выпущенный код. Активность без измеримого результата читается как интерес, а не как достижение.",
      },
      ...boost,
    });
  }

  if (!gaps.honors.hasNationalOrAbove) {
    const boost = measureBoost(profile, targets, baseline, withHonor);
    actions.push({
      id: "honor",
      tier: tierFor(boost.admissionsBoost + boost.fundingBoost),
      difficulty: "High",
      phase: 2,
      weeks: track === "building" ? 24 : 10,
      title: { en: "Win one national-level recognition", ru: "Получить признание национального уровня" },
      detail: COMPETITION_TARGET[profile.majorInterest] ?? DEFAULT_COMPETITION,
      ...boost,
    });
  }

  // --- Phase 3: execution (always present, never a dead end) ---------------
  const executionDetail: Record<GradeLevel, Bilingual> = {
    "10th": {
      en: "Open a CSS Profile account now and read what it asks for. Knowing the documentation two years early is what separates families who get full aid from families who qualify for it.",
      ru: "Заведите аккаунт CSS Profile сейчас и прочитайте, что там требуется. Знание документов за два года вперёд отличает семьи, которые получают полную помощь, от тех, кто лишь имеет на неё право.",
    },
    "11th": {
      en: "Shortlist which schools require CSS Profile versus ISFAA, and confirm which are need-blind for internationals. Build the list around funding mechanics before you fall in love with names.",
      ru: "Определите, где требуется CSS Profile, а где ISFAA, и уточните, какие вузы need-blind для иностранцев. Стройте список вокруг механики финансирования, а не вокруг громких имён.",
    },
    "12th": {
      en: "Essays and aid forms outrank everything else now. File CSS Profile and ISFAA alongside each application — a late aid form voids a full-ride offer as surely as a rejection.",
      ru: "Сейчас эссе и формы на помощь важнее всего. Подавайте CSS Profile и ISFAA вместе с каждой заявкой — опоздание с формой обнуляет полный грант так же надёжно, как отказ.",
    },
    "gap-year": {
      en: "Your essays must account for the gap year with evidence, not explanation. Attach one concrete result from it, then file CSS Profile and ISFAA with every application.",
      ru: "Ваши эссе должны объяснять gap year результатами, а не оправданиями. Приложите один конкретный результат, затем подавайте CSS Profile и ISFAA с каждой заявкой.",
    },
  };

  actions.push({
    id: "execution",
    tier: track === "executing" ? "Crucial" : "Recommended",
    difficulty: track === "executing" ? "High" : "Low",
    phase: 3,
    weeks: track === "executing" ? 6 : 4,
    title:
      track === "executing"
        ? { en: "Execute applications and aid paperwork", ru: "Выполнить подачу и документы на помощь" }
        : { en: "Map the financial aid paperwork early", ru: "Заранее разобраться с документами на помощь" },
    detail: executionDetail[profile.gradeLevel] ?? executionDetail["11th"],
    admissionsBoost: 0,
    fundingBoost: track === "executing" ? 6 : 3,
  });

  // Highest combined impact first.
  actions.sort(
    (a, b) => b.admissionsBoost + b.fundingBoost - (a.admissionsBoost + a.fundingBoost),
  );

  // Point B: the same index the diagnostic returns once everything is done.
  const upgraded = withDepth(withHonor(withProject(withEnglish(withSat(withGpa(profile))))));
  const pointB = calculateProfileDiagnostic(upgraded, now).startingPointIndex;
  const upgradedOdds = averageOdds(upgraded, targets);

  const phases: Phase[] = ([1, 2, 3] as PhaseId[]).map((id) => ({
    id,
    title: PHASE_META[id].title,
    summary: PHASE_META[id].summary,
    items: actions.filter((action) => action.phase === id),
  }));

  return {
    pointA: diagnostic.startingPointIndex,
    pointB: Math.max(pointB, diagnostic.startingPointIndex),
    track,
    gaps,
    actions,
    phases,
    milestones: buildMilestones(profile.gradeLevel, nextDeadline(profile.gradeLevel, now)),
    deadline: nextDeadline(profile.gradeLevel, now),
    projectedBoost: {
      admissions: Math.round(clamp(upgradedOdds.admissions - baseline.admissions, 0, 100)),
      funding: Math.round(clamp(upgradedOdds.funding - baseline.funding, 0, 100)),
    },
    focusUniversityId,
  };
}
