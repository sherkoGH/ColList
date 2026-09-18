"use client";

import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

const CONTROL =
  "w-full rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 transition-colors outline-none placeholder:text-slate-600 focus:border-emerald-accent/60 disabled:cursor-not-allowed disabled:opacity-40";

export function FieldLabel({
  htmlFor,
  children,
  hint,
}: {
  htmlFor?: string;
  children: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between gap-3">
      <label htmlFor={htmlFor} className="text-xs tracking-wide text-slate-400 uppercase">
        {children}
      </label>
      {hint && <span className="text-[0.65rem] text-slate-600">{hint}</span>}
    </div>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${CONTROL} ${props.className ?? ""}`} />;
}

export function SelectInput({
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <select {...props} className={`${CONTROL} cursor-pointer ${props.className ?? ""}`}>
      {children}
    </select>
  );
}
