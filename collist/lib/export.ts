import { DEFAULT_PROFILE, reconcileProfile, type UserProfile } from "@/context/UserContext";
import type { ProfileDiagnostic } from "@/lib/diagnostic";
import type { CollegeMatch } from "@/lib/matcher";
import type { StrategicRoadmap } from "@/lib/roadmap";

export type Language = "en" | "ru";

/** Bumped whenever UserProfile's shape changes in a way import must handle. */
export const BACKUP_VERSION = 1;

export type ProfileBackup = {
  app: "collist";
  version: number;
  exportedAt: string;
  profile: UserProfile;
};

export type ImportResult =
  | { ok: true; profile: UserProfile; migrated: boolean }
  | { ok: false; reason: "invalid-json" | "not-a-collist-backup" | "no-profile" };

export function buildProfileBackup(profile: UserProfile): ProfileBackup {
  return {
    app: "collist",
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    profile,
  };
}

export function serializeProfileBackup(profile: UserProfile): string {
  return JSON.stringify(buildProfileBackup(profile), null, 2);
}

/**
 * Parse a backup file.
 *
 * Validation runs through the same `reconcileProfile` the live store uses, so
 * a file written by an older build is migrated rather than rejected — and a
 * hand-edited file cannot inject an out-of-range GPA or unknown grade.
 */
export function parseProfileBackup(raw: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: "invalid-json" };
  }

  if (typeof parsed !== "object" || parsed === null) {
    return { ok: false, reason: "not-a-collist-backup" };
  }

  const candidate = parsed as Partial<ProfileBackup> & Record<string, unknown>;

  // Accept both a wrapped backup and a bare profile object.
  const payload =
    candidate.app === "collist" && candidate.profile
      ? candidate.profile
      : "gradeLevel" in candidate
        ? candidate
        : null;

  if (!payload) return { ok: false, reason: "no-profile" };

  const profile = reconcileProfile(payload, DEFAULT_PROFILE);
  const migrated =
    typeof candidate.version === "number" ? candidate.version < BACKUP_VERSION : true;

  return { ok: true, profile, migrated };
}

const LABELS = {
  en: {
    title: "ColList — Full-Funding Strategy Report",
    generated: "Generated",
    profile: "Point A — Baseline profile",
    grade: "Grade",
    gpa: "GPA",
    testing: "Testing",
    activities: "Activities",
    honors: "Honors",
    major: "Field",
    regions: "Regions",
    anywhere: "Open to anywhere",
    undecided: "Undecided",
    none: "None",
    notSubmitted: "Not submitted",
    testOptional: "Test-optional",
    scores: "Diagnostic scores",
    academic: "Academic fitness",
    testReadiness: "Testing readiness",
    ecImpact: "Activities & honors",
    aidIndex: "Full-funding aid index",
    startingIndex: "Starting point index",
    matrix: "Point B — 8-college match matrix",
    admissions: "Admissions",
    funding: "Full-funding",
    category: "Category",
    aidType: "Aid model",
    roadmap: "Roadmap — priority actions",
    tier: "Priority",
    timeframe: "Timeframe",
    weeks: "weeks",
    projected: "Projected if completed",
    deadline: "Next deadline",
    daysLeft: "days left",
    phases: "Phase timeline",
    disclaimer:
      "Admission and funding figures are modelled estimates from published CDS-style benchmarks, not guarantees. Verify every deadline and aid requirement with the university directly.",
  },
  ru: {
    title: "ColList — Стратегия полного финансирования",
    generated: "Сформировано",
    profile: "Точка А — Базовый профиль",
    grade: "Класс",
    gpa: "GPA",
    testing: "Тесты",
    activities: "Активности",
    honors: "Награды",
    major: "Направление",
    regions: "Регионы",
    anywhere: "Любой регион",
    undecided: "Не определено",
    none: "Нет",
    notSubmitted: "Не подан",
    testOptional: "Без тестов",
    scores: "Диагностические баллы",
    academic: "Академическая форма",
    testReadiness: "Готовность по тестам",
    ecImpact: "Активности и награды",
    aidIndex: "Индекс полного финансирования",
    startingIndex: "Индекс стартовой точки",
    matrix: "Точка Б — Матрица из 8 университетов",
    admissions: "Поступление",
    funding: "Финансирование",
    category: "Категория",
    aidType: "Модель помощи",
    roadmap: "Дорожная карта — приоритетные действия",
    tier: "Приоритет",
    timeframe: "Срок",
    weeks: "нед.",
    projected: "Прогноз при выполнении",
    deadline: "Ближайший дедлайн",
    daysLeft: "дней осталось",
    phases: "Фазы",
    disclaimer:
      "Показатели поступления и финансирования — моделируемые оценки на основе публичных ориентиров формата CDS, а не гарантии. Проверяйте каждый дедлайн и требование к помощи напрямую в университете.",
  },
} as const;

export function exportLabels(language: Language) {
  return LABELS[language];
}

function testingSummary(profile: UserProfile, language: Language): string {
  const L = LABELS[language];
  const parts: string[] = [];
  if (profile.satStatus === "taken" && profile.satScore) parts.push(`SAT ${profile.satScore}`);
  if (profile.satStatus === "optional") parts.push(L.testOptional);
  if (profile.englishStatus === "taken" && profile.englishScore) {
    parts.push(`${profile.englishTest} ${profile.englishScore}`);
  }
  return parts.join(" · ") || L.notSubmitted;
}

/**
 * Plain-text summary for an advisor or parent — pasted into email, WhatsApp or
 * Telegram. Deliberately free of markdown so it survives any client.
 */
export function buildAdvisorSummary(
  profile: UserProfile,
  diagnostic: ProfileDiagnostic,
  matches: CollegeMatch[],
  roadmap: StrategicRoadmap,
  language: Language,
): string {
  const L = LABELS[language];
  const line = "-".repeat(46);

  const gpaText =
    profile.gpaScale === 5
      ? `${profile.gpaRaw.toFixed(2)}/5.0 (${diagnostic.normalizedGpa.toFixed(2)}/4.0)`
      : `${diagnostic.normalizedGpa.toFixed(2)}/4.0`;

  const rows = [
    L.title,
    `${L.generated}: ${new Date().toLocaleDateString(language === "ru" ? "ru-RU" : "en-GB")}`,
    line,
    `${L.profile}`,
    `  ${L.grade}: ${profile.gradeLevel}`,
    `  ${L.gpa}: ${gpaText}`,
    `  ${L.testing}: ${testingSummary(profile, language)}`,
    `  ${L.activities}: ${diagnostic.activityCount} | ${L.honors}: ${diagnostic.honorCount}`,
    `  ${L.startingIndex}: ${diagnostic.startingPointIndex}/100`,
    `  ${L.aidIndex}: ${diagnostic.fullAidIndex}/100`,
    line,
    `${L.matrix}`,
    ...matches.map(
      (m) =>
        `  ${m.university.name} (${m.category}) — ${L.admissions} ${m.admissionsOdds}% | ${L.funding} ${m.fundingOdds}%`,
    ),
    line,
    `${L.roadmap}`,
    ...roadmap.actions
      .slice(0, 3)
      .map(
        (a, i) =>
          `  ${i + 1}. [${a.tier}] ${a.title[language]} (${a.weeks} ${L.weeks})\n     ${a.detail[language]}`,
      ),
    line,
    `${L.deadline}: ${roadmap.deadline.label[language]} — ${roadmap.deadline.isoDate} (${roadmap.deadline.daysRemaining} ${L.daysLeft})`,
    `${L.projected}: +${roadmap.projectedBoost.admissions}% ${L.admissions} / +${roadmap.projectedBoost.funding}% ${L.funding}`,
    line,
    L.disclaimer,
  ];

  return rows.join("\n");
}

/** Trigger a browser download without adding a dependency. */
export function downloadTextFile(filename: string, contents: string, mime = "application/json") {
  const blob = new Blob([contents], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoke on the next tick so Safari has time to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Clipboard API needs a secure context and permission; fall back to a
    // hidden textarea so the button still works over plain http.
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}
