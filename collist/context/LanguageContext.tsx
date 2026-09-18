"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { createPersistentStore } from "@/lib/persistent-store";

/** ColList ships in exactly two languages. Nothing else is supported. */
export const LANGUAGES = ["en", "ru"] as const;
export type Language = (typeof LANGUAGES)[number];

export const LANGUAGE_LABELS: Record<Language, { code: string; native: string }> = {
  en: { code: "EN", native: "English" },
  ru: { code: "RU", native: "Русский" },
};

/**
 * Sprint 1 scope: only the strings the navigation bar renders.
 * Sections add their own keys as they are built.
 */
const dictionary = {
  en: {
    "nav.matches": "Matches",
    "nav.diagnostic": "Diagnostic",
    "nav.roadmap": "Roadmap",
    "nav.cta": "Start Journey",
    "nav.tagline": "Full-Funding Navigator",
    "nav.language": "Language",
    "nav.theme": "Toggle day and night",

    "hero.eyebrow": "100% Full-Funding Navigator",
    "hero.headline": "Get accepted into",
    "hero.target.ivy": "the Ivy League",
    "hero.target.t20": "T20 Universities",
    "hero.target.nyuad": "NYU Abu Dhabi",
    "hero.target.asia": "Asian Tech Hubs",
    "hero.target.lac": "Full-Ride LACs",
    "hero.subtitle":
      "ColList maps the universities that cover tuition, housing and stipend in full — for 10th–12th graders and gap-year reappliers who refuse to pay sticker price.",
    "hero.cta": "Find Your Future",
    "hero.scrollHint": "See where the money is",

    "marquee.label": "Institutions with full-need or full-ride commitments",
    "marquee.disclaimer": "Demo Data",

    "aid.needBlind": "Need-Blind",
    "aid.fullNeed": "Full Need Met",
    "aid.fullRide": "Full Ride",
    "aid.fullScholarship": "Full Scholarship",
    "aid.noLoan": "No-Loan",

    "ascii.caption": "Built for students who earn their place, not buy it",
  },
  ru: {
    "nav.matches": "Подборка",
    "nav.diagnostic": "Диагностика",
    "nav.roadmap": "Дорожная карта",
    "nav.cta": "Начать путь",
    "nav.tagline": "Навигатор полного финансирования",
    "nav.language": "Язык",
    "nav.theme": "Переключить день и ночь",

    "hero.eyebrow": "Навигатор 100% финансирования",
    "hero.headline": "Поступай в",
    "hero.target.ivy": "Лигу плюща",
    "hero.target.t20": "топ-20 университетов",
    "hero.target.nyuad": "NYU Abu Dhabi",
    "hero.target.asia": "технохабы Азии",
    "hero.target.lac": "колледжи с полным грантом",
    "hero.subtitle":
      "ColList показывает университеты, которые полностью покрывают обучение, проживание и стипендию — для учеников 10–12 классов и тех, кто подаётся повторно после gap year.",
    "hero.cta": "Найти университет",
    "hero.scrollHint": "Посмотреть, где деньги",

    "marquee.label": "Университеты с полным покрытием расходов",
    "marquee.disclaimer": "Демо-данные",

    "aid.needBlind": "Need-Blind",
    "aid.fullNeed": "Полное покрытие нужды",
    "aid.fullRide": "Полный грант",
    "aid.fullScholarship": "Полная стипендия",
    "aid.noLoan": "Без кредитов",

    "ascii.caption": "Для тех, кто заслуживает место, а не покупает его",
  },
} as const;

export type TranslationKey = keyof (typeof dictionary)["en"];

function isLanguage(value: unknown): value is Language {
  return typeof value === "string" && (LANGUAGES as readonly string[]).includes(value);
}

const languageStore = createPersistentStore<Language>("collist.language", "en", isLanguage);

type LanguageContextValue = {
  language: Language;
  setLanguage: (next: Language) => void;
  t: (key: TranslationKey) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const language = useSyncExternalStore(
    languageStore.subscribe,
    languageStore.getSnapshot,
    languageStore.getServerSnapshot,
  );

  // Keep the document language in sync for screen readers and hyphenation.
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((next: Language) => {
    languageStore.set(next);
  }, []);

  const t = useCallback(
    (key: TranslationKey) => dictionary[language][key] ?? dictionary.en[key],
    [language],
  );

  const value = useMemo(
    () => ({ language, setLanguage, t }),
    [language, setLanguage, t],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used inside <LanguageProvider>.");
  }
  return context;
}
