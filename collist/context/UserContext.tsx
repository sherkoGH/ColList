"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { createPersistentObjectStore } from "@/lib/persistent-store";

export const GRADE_LEVELS = ["10th", "11th", "12th", "gap-year"] as const;
export type GradeLevel = (typeof GRADE_LEVELS)[number];

/** Grades an honour can be awarded in — starts a year earlier than applying. */
export const AWARD_GRADES = ["9th", "10th", "11th", "12th"] as const;
export type AwardGrade = (typeof AWARD_GRADES)[number];

export const GPA_SCALES = [4, 5] as const;
export type GpaScale = (typeof GPA_SCALES)[number];

/** `optional` means the student is deliberately applying test-optional. */
export const TEST_STATUSES = ["taken", "planned", "optional"] as const;
export type TestStatus = (typeof TEST_STATUSES)[number];

export const ENGLISH_TESTS = ["IELTS", "TOEFL", "Duolingo"] as const;
export type EnglishTest = (typeof ENGLISH_TESTS)[number];

export const EC_TIERS = [
  "Olympiads/Research",
  "Leadership/Projects",
  "Community/Varsity",
] as const;
export type EcTier = (typeof EC_TIERS)[number];

export const HONOR_LEVELS = ["International", "National", "Regional", "School"] as const;
export type HonorLevel = (typeof HONOR_LEVELS)[number];

export const REGIONS = ["US", "Middle East", "Europe", "Asia"] as const;
export type Region = (typeof REGIONS)[number];

export const MAX_ACTIVITIES = 10;
export const MAX_HONORS = 5;
export const MAX_ACTIVITY_DESCRIPTION = 150;

export type Activity = {
  id: string;
  title: string;
  role: string;
  description: string;
  tier: EcTier;
};

export type Honor = {
  id: string;
  title: string;
  level: HonorLevel;
  gradeAwarded: AwardGrade;
};

export type UserProfile = {
  gradeLevel: GradeLevel;
  /** What the student typed, on whichever scale they picked. */
  gpaRaw: number;
  gpaScale: GpaScale;
  /** 4.0-equivalent of `gpaRaw`, the only value matching should read. */
  gpa: number;
  satStatus: TestStatus;
  satScore: number | null;
  englishTest: EnglishTest;
  englishStatus: TestStatus;
  englishScore: number | null;
  activities: Activity[];
  honors: Honor[];
  /** Derived from the strongest activity tier; kept for the match algorithm. */
  ecTier: EcTier;
  /**
   * Ranking hints only. An empty list means "open to anywhere", and a populated
   * one must never remove a fully-funded university from results.
   */
  preferredRegions: string[];
  majorInterest: string;
  hasCompletedOnboarding: boolean;
};

/**
 * Convert a raw GPA to its 4.0 equivalent.
 *
 * The CIS 5-point scale is not a stretched 4-point scale: 5 is an A, 4 a B and
 * 3 a C, so the honest mapping is a one-point shift. Scaling linearly
 * (raw / 5 * 4) would turn a 4.0/5.0 into 3.2 rather than 3.0 and quietly
 * inflate every CIS applicant against need-blind thresholds.
 */
export function normalizeGpa(raw: number, scale: GpaScale): number {
  const value = scale === 5 ? raw - 1 : raw;
  return Math.min(4, Math.max(0, Number(value.toFixed(2))));
}

const TIER_STRENGTH: Record<EcTier, number> = {
  "Olympiads/Research": 3,
  "Leadership/Projects": 2,
  "Community/Varsity": 1,
};

/** The strongest single activity defines the profile's tier. */
export function deriveEcTier(activities: Activity[], fallback: EcTier): EcTier {
  if (activities.length === 0) return fallback;
  return activities.reduce<EcTier>(
    (best, activity) =>
      TIER_STRENGTH[activity.tier] > TIER_STRENGTH[best] ? activity.tier : best,
    "Community/Varsity",
  );
}

export const DEFAULT_PROFILE: UserProfile = {
  gradeLevel: "11th",
  gpaRaw: 3.7,
  gpaScale: 4,
  gpa: 3.7,
  satStatus: "planned",
  satScore: null,
  englishTest: "IELTS",
  englishStatus: "planned",
  englishScore: null,
  activities: [],
  honors: [],
  ecTier: "Leadership/Projects",
  preferredRegions: [],
  majorInterest: "",
  hasCompletedOnboarding: false,
};

const oneOf = <T extends string | number>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T => (allowed as readonly unknown[]).includes(value) ? (value as T) : fallback;

const numberInRange = (value: unknown, min: number, max: number, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) && value >= min && value <= max
    ? value
    : fallback;

const nullableNumber = (value: unknown, min: number, max: number) =>
  typeof value === "number" && Number.isFinite(value) && value >= min && value <= max
    ? value
    : null;

const text = (value: unknown, maxLength: number) =>
  typeof value === "string" ? value.slice(0, maxLength) : "";

function reconcileActivities(value: unknown): Activity[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, MAX_ACTIVITIES).map((entry, index) => {
    const raw = (entry ?? {}) as Record<string, unknown>;
    return {
      id: typeof raw.id === "string" && raw.id ? raw.id : `activity-${index}`,
      title: text(raw.title, 120),
      role: text(raw.role, 120),
      description: text(raw.description, MAX_ACTIVITY_DESCRIPTION),
      tier: oneOf(raw.tier, EC_TIERS, "Leadership/Projects"),
    };
  });
}

function reconcileHonors(value: unknown): Honor[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, MAX_HONORS).map((entry, index) => {
    const raw = (entry ?? {}) as Record<string, unknown>;
    return {
      id: typeof raw.id === "string" && raw.id ? raw.id : `honor-${index}`,
      title: text(raw.title, 120),
      level: oneOf(raw.level, HONOR_LEVELS, "School"),
      gradeAwarded: oneOf(raw.gradeAwarded, AWARD_GRADES, "11th"),
    };
  });
}

/**
 * Validate whatever localStorage held. Profiles written by earlier builds are
 * migrated rather than discarded — a student who filled this in last week
 * should not lose their answers to a schema change.
 */
export function reconcileProfile(
  parsed: unknown,
  fallback: UserProfile = DEFAULT_PROFILE,
): UserProfile {
  if (typeof parsed !== "object" || parsed === null) return fallback;
  const raw = parsed as Record<string, unknown>;

  const gpaScale = oneOf(raw.gpaScale, GPA_SCALES, fallback.gpaScale);
  // Pre-scale profiles stored only `gpa`, always on the 4.0 scale.
  const gpaRaw = numberInRange(
    raw.gpaRaw ?? raw.gpa,
    0,
    gpaScale,
    Math.min(fallback.gpaRaw, gpaScale),
  );

  // Pre-status profiles carried a boolean `isTestOptional`.
  const legacyOptional = raw.isTestOptional === true;
  const satStatus = legacyOptional
    ? "optional"
    : oneOf(raw.satStatus, TEST_STATUSES, fallback.satStatus);

  const activities = reconcileActivities(raw.activities);

  return {
    gradeLevel: oneOf(raw.gradeLevel, GRADE_LEVELS, fallback.gradeLevel),
    gpaRaw,
    gpaScale,
    gpa: normalizeGpa(gpaRaw, gpaScale),
    satStatus,
    satScore: satStatus === "optional" ? null : nullableNumber(raw.satScore, 400, 1600),
    englishTest: oneOf(raw.englishTest, ENGLISH_TESTS, fallback.englishTest),
    englishStatus: oneOf(raw.englishStatus, TEST_STATUSES, fallback.englishStatus),
    englishScore: nullableNumber(raw.englishScore ?? raw.ieltsScore, 0, 200),
    activities,
    honors: reconcileHonors(raw.honors),
    ecTier: deriveEcTier(activities, oneOf(raw.ecTier, EC_TIERS, fallback.ecTier)),
    preferredRegions: Array.isArray(raw.preferredRegions)
      ? raw.preferredRegions.filter(
          (region): region is string =>
            typeof region === "string" && (REGIONS as readonly string[]).includes(region),
        )
      : fallback.preferredRegions,
    majorInterest: typeof raw.majorInterest === "string" ? raw.majorInterest : fallback.majorInterest,
    hasCompletedOnboarding:
      typeof raw.hasCompletedOnboarding === "boolean"
        ? raw.hasCompletedOnboarding
        : fallback.hasCompletedOnboarding,
  };
}

const profileStore = createPersistentObjectStore<UserProfile>(
  "collist.profile",
  DEFAULT_PROFILE,
  reconcileProfile,
);

type UserContextValue = {
  profile: UserProfile;
  updateProfile: (patch: Partial<UserProfile>) => void;
  resetProfile: () => void;
};

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const profile = useSyncExternalStore(
    profileStore.subscribe,
    profileStore.getSnapshot,
    profileStore.getServerSnapshot,
  );

  const updateProfile = useCallback((patch: Partial<UserProfile>) => {
    const next = { ...profileStore.getSnapshot(), ...patch };
    // Keep the derived fields honest no matter which patch arrives.
    next.gpa = normalizeGpa(next.gpaRaw, next.gpaScale);
    next.ecTier = deriveEcTier(next.activities, next.ecTier);
    profileStore.set(next);
  }, []);

  const resetProfile = useCallback(() => {
    profileStore.set(DEFAULT_PROFILE);
  }, []);

  const value = useMemo(
    () => ({ profile, updateProfile, resetProfile }),
    [profile, updateProfile, resetProfile],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used inside <UserProvider>.");
  }
  return context;
}
