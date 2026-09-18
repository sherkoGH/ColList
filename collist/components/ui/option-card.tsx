"use client";

import { Check } from "lucide-react";

type OptionCardProps = {
  label: string;
  note?: string;
  selected: boolean;
  onSelect: () => void;
  /** Multi-select renders a checkbox role instead of a radio. */
  multi?: boolean;
};

export function OptionCard({ label, note, selected, onSelect, multi = false }: OptionCardProps) {
  return (
    <button
      type="button"
      role={multi ? "checkbox" : "radio"}
      aria-checked={selected}
      onClick={onSelect}
      className={`group flex w-full cursor-pointer items-start gap-3 rounded-xl border p-4 text-left transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-accent ${
        selected
          ? "border-emerald-accent/60 bg-emerald-accent/10 shadow-[0_0_24px_-8px_rgba(16,185,129,0.5)]"
          : "border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900/80"
      }`}
    >
      <span
        aria-hidden
        className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center border transition-colors duration-200 ${
          multi ? "rounded-md" : "rounded-full"
        } ${
          selected
            ? "border-emerald-accent bg-emerald-accent text-slate-950"
            : "border-slate-600 text-transparent group-hover:border-slate-500"
        }`}
      >
        <Check className="h-3 w-3" strokeWidth={3} />
      </span>

      <span className="flex flex-col gap-1">
        <span className={`text-sm font-medium ${selected ? "text-slate-50" : "text-slate-200"}`}>
          {label}
        </span>
        {note && <span className="text-xs leading-relaxed text-slate-400">{note}</span>}
      </span>
    </button>
  );
}

export default OptionCard;
