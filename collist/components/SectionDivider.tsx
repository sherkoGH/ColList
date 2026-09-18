"use client";

import AsciiArt from "@/components/ui/ascii-art";
import { useLanguage } from "@/context/LanguageContext";

/** Archway divider marking the shift from the pitch into the product. */
export function SectionDivider() {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col items-center gap-5 py-20">
      <AsciiArt />
      <span className="px-6 text-center text-[0.65rem] tracking-[0.22em] text-slate-600 uppercase">
        {t("ascii.caption")}
      </span>
    </div>
  );
}

export default SectionDivider;
