"use client";

import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { FieldLabel, SelectInput, TextInput } from "@/components/ui/field";
import { useLanguage, type TranslationKey } from "@/context/LanguageContext";
import {
  EC_TIERS,
  MAX_ACTIVITIES,
  MAX_ACTIVITY_DESCRIPTION,
  type Activity,
  type EcTier,
} from "@/context/UserContext";

const TIER_LABEL: Record<EcTier, TranslationKey> = {
  "Olympiads/Research": "ob.tier.olympiadsResearch",
  "Leadership/Projects": "ob.tier.leadershipProjects",
  "Community/Varsity": "ob.tier.communityVarsity",
};

function newActivity(): Activity {
  return {
    id: `activity-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: "",
    role: "",
    description: "",
    tier: "Leadership/Projects",
  };
}

export function ActivityList({
  activities,
  onChange,
}: {
  activities: Activity[];
  onChange: (next: Activity[]) => void;
}) {
  const { t } = useLanguage();
  const [openId, setOpenId] = useState<string | null>(null);
  const atLimit = activities.length >= MAX_ACTIVITIES;

  function add() {
    if (atLimit) return;
    const entry = newActivity();
    onChange([...activities, entry]);
    setOpenId(entry.id);
  }

  function patch(id: string, update: Partial<Activity>) {
    onChange(activities.map((a) => (a.id === id ? { ...a, ...update } : a)));
  }

  function remove(id: string) {
    onChange(activities.filter((a) => a.id !== id));
    if (openId === id) setOpenId(null);
  }

  return (
    <section>
      <header className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-slate-200">
          {t("ob.act.heading")}
          <span className="ml-2 text-xs text-slate-500">
            {activities.length}/{MAX_ACTIVITIES}
          </span>
        </h3>
        <span className="rounded-full border border-slate-800 px-2 py-0.5 text-[0.6rem] tracking-wide text-slate-500 uppercase">
          {t("ob.optional")}
        </span>
      </header>

      {activities.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-800 bg-slate-900/30 px-4 py-5 text-center text-xs leading-relaxed text-slate-500">
          {t("ob.act.empty")}
        </p>
      ) : (
        <ul className="grid gap-2">
          {activities.map((activity) => {
            const open = openId === activity.id;
            const remaining = MAX_ACTIVITY_DESCRIPTION - activity.description.length;

            return (
              <li
                key={activity.id}
                className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50"
              >
                <div className="flex items-center gap-2 pr-2">
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpenId(open ? null : activity.id)}
                    className="flex flex-1 cursor-pointer items-center gap-3 px-4 py-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-accent"
                  >
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-slate-100">
                        {activity.title || t("ob.act.untitled")}
                      </span>
                      {activity.role && (
                        <span className="block truncate text-xs text-slate-500">{activity.role}</span>
                      )}
                    </span>
                    <span className="shrink-0 rounded-full bg-emerald-accent/10 px-2.5 py-0.5 text-[0.6rem] font-semibold text-emerald-accent">
                      {t(TIER_LABEL[activity.tier])}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(activity.id)}
                    aria-label={t("ob.act.remove")}
                    className="cursor-pointer rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-800/60 hover:text-red-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-accent"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {open && (
                  <div className="animate-fade-in grid gap-4 border-t border-slate-800/80 p-4">
                    <div>
                      <FieldLabel htmlFor={`${activity.id}-title`}>{t("ob.act.title")}</FieldLabel>
                      <TextInput
                        id={`${activity.id}-title`}
                        value={activity.title}
                        maxLength={120}
                        onChange={(e) => patch(activity.id, { title: e.target.value })}
                      />
                    </div>
                    <div>
                      <FieldLabel htmlFor={`${activity.id}-role`}>{t("ob.act.role")}</FieldLabel>
                      <TextInput
                        id={`${activity.id}-role`}
                        value={activity.role}
                        maxLength={120}
                        onChange={(e) => patch(activity.id, { role: e.target.value })}
                      />
                    </div>
                    <div>
                      <FieldLabel
                        htmlFor={`${activity.id}-desc`}
                        hint={`${remaining} ${t("ob.charsLeft")}`}
                      >
                        {t("ob.act.desc")}
                      </FieldLabel>
                      <textarea
                        id={`${activity.id}-desc`}
                        rows={3}
                        value={activity.description}
                        maxLength={MAX_ACTIVITY_DESCRIPTION}
                        onChange={(e) => patch(activity.id, { description: e.target.value })}
                        className="w-full resize-none rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm leading-relaxed text-slate-100 transition-colors outline-none placeholder:text-slate-600 focus:border-emerald-accent/60"
                      />
                    </div>
                    <div>
                      <FieldLabel htmlFor={`${activity.id}-tier`}>{t("ob.act.tier")}</FieldLabel>
                      <SelectInput
                        id={`${activity.id}-tier`}
                        value={activity.tier}
                        onChange={(e) => patch(activity.id, { tier: e.target.value as EcTier })}
                      >
                        {EC_TIERS.map((tier) => (
                          <option key={tier} value={tier}>
                            {t(TIER_LABEL[tier])}
                          </option>
                        ))}
                      </SelectInput>
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
        {atLimit ? t("ob.act.full") : t("ob.act.add")}
      </button>
    </section>
  );
}

export default ActivityList;
