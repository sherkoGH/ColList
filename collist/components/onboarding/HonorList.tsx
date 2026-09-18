"use client";

import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { FieldLabel, SelectInput, TextInput } from "@/components/ui/field";
import { useLanguage, type TranslationKey } from "@/context/LanguageContext";
import {
  AWARD_GRADES,
  HONOR_LEVELS,
  MAX_HONORS,
  type AwardGrade,
  type Honor,
  type HonorLevel,
} from "@/context/UserContext";

function newHonor(): Honor {
  return {
    id: `honor-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: "",
    level: "National",
    gradeAwarded: "11th",
  };
}

export function HonorList({
  honors,
  onChange,
}: {
  honors: Honor[];
  onChange: (next: Honor[]) => void;
}) {
  const { t } = useLanguage();
  const [openId, setOpenId] = useState<string | null>(null);
  const atLimit = honors.length >= MAX_HONORS;

  function add() {
    if (atLimit) return;
    const entry = newHonor();
    onChange([...honors, entry]);
    setOpenId(entry.id);
  }

  function patch(id: string, update: Partial<Honor>) {
    onChange(honors.map((h) => (h.id === id ? { ...h, ...update } : h)));
  }

  function remove(id: string) {
    onChange(honors.filter((h) => h.id !== id));
    if (openId === id) setOpenId(null);
  }

  return (
    <section>
      <header className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-slate-200">
          {t("ob.hon.heading")}
          <span className="ml-2 text-xs text-slate-500">
            {honors.length}/{MAX_HONORS}
          </span>
        </h3>
        <span className="rounded-full border border-slate-800 px-2 py-0.5 text-[0.6rem] tracking-wide text-slate-500 uppercase">
          {t("ob.optional")}
        </span>
      </header>

      {honors.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-800 bg-slate-900/30 px-4 py-5 text-center text-xs leading-relaxed text-slate-500">
          {t("ob.hon.empty")}
        </p>
      ) : (
        <ul className="grid gap-2">
          {honors.map((honor) => {
            const open = openId === honor.id;

            return (
              <li
                key={honor.id}
                className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50"
              >
                <div className="flex items-center gap-2 pr-2">
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpenId(open ? null : honor.id)}
                    className="flex flex-1 cursor-pointer items-center gap-3 px-4 py-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-accent"
                  >
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                    />
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-100">
                      {honor.title || t("ob.hon.untitled")}
                    </span>
                    <span className="shrink-0 rounded-full bg-amber-highlight/10 px-2.5 py-0.5 text-[0.6rem] font-semibold text-amber-highlight">
                      {t(`ob.level.${honor.level}` as TranslationKey)}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(honor.id)}
                    aria-label={t("ob.hon.remove")}
                    className="cursor-pointer rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-800/60 hover:text-red-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-accent"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {open && (
                  <div className="animate-fade-in grid gap-4 border-t border-slate-800/80 p-4">
                    <div>
                      <FieldLabel htmlFor={`${honor.id}-title`}>{t("ob.hon.title")}</FieldLabel>
                      <TextInput
                        id={`${honor.id}-title`}
                        value={honor.title}
                        maxLength={120}
                        onChange={(e) => patch(honor.id, { title: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <FieldLabel htmlFor={`${honor.id}-level`}>{t("ob.hon.level")}</FieldLabel>
                        <SelectInput
                          id={`${honor.id}-level`}
                          value={honor.level}
                          onChange={(e) => patch(honor.id, { level: e.target.value as HonorLevel })}
                        >
                          {HONOR_LEVELS.map((level) => (
                            <option key={level} value={level}>
                              {t(`ob.level.${level}` as TranslationKey)}
                            </option>
                          ))}
                        </SelectInput>
                      </div>
                      <div>
                        <FieldLabel htmlFor={`${honor.id}-grade`}>{t("ob.hon.grade")}</FieldLabel>
                        <SelectInput
                          id={`${honor.id}-grade`}
                          value={honor.gradeAwarded}
                          onChange={(e) =>
                            patch(honor.id, { gradeAwarded: e.target.value as AwardGrade })
                          }
                        >
                          {AWARD_GRADES.map((grade) => (
                            <option key={grade} value={grade}>
                              {t(`ob.awardGrade.${grade}` as TranslationKey)}
                            </option>
                          ))}
                        </SelectInput>
                      </div>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <button
        type="button"
        onClick={add}
        disabled={atLimit}
        className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-700 px-4 py-2.5 text-xs text-slate-400 transition-colors hover:border-emerald-accent/50 hover:text-emerald-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-700 disabled:hover:text-slate-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-accent"
      >
        <Plus className="h-3.5 w-3.5" />
        {atLimit ? t("ob.hon.full") : t("ob.hon.add")}
      </button>
    </section>
  );
}

export default HonorList;
