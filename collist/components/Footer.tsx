"use client";

import { Mail, Send } from "lucide-react";
import Image from "next/image";

import { useLanguage } from "@/context/LanguageContext";

const EMAIL = "eskays2k@gmail.com";
const TELEGRAM_URL = "https://t.me/sherko09";
/** Bump when the year rolls over; kept literal so the markup never drifts
    between server and client render. */
const COPYRIGHT_YEAR = 2026;

export function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="no-print mt-auto border-t border-slate-800/80 bg-slate-950/40 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
          {/* Brand */}
          <a href="#top" className="group flex items-center gap-3 self-start">
            <Image
              src="/collistlogo-mark.png"
              alt=""
              width={72}
              height={72}
              className="h-10 w-10 shrink-0 object-contain transition-transform duration-300 group-hover:scale-105"
            />
            <span className="font-display text-xl tracking-[0.12em] text-slate-50">
              Col<span className="text-emerald-accent">List</span>
            </span>
          </a>

          {/* Contact */}
          <div className="sm:text-right">
            <h2 className="text-[0.65rem] tracking-[0.2em] text-slate-500 uppercase">
              {t("foot.contact")}
            </h2>
            <ul className="mt-3 space-y-2">
              <li>
                <a
                  href={`mailto:${EMAIL}`}
                  className="group inline-flex items-center gap-2 text-sm text-slate-300 transition-colors hover:text-emerald-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-accent sm:flex-row-reverse"
                >
                  <Mail className="h-3.5 w-3.5 shrink-0 text-slate-500 transition-colors group-hover:text-emerald-accent" />
                  {EMAIL}
                </a>
              </li>
              <li>
                <a
                  href={TELEGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-2 text-sm text-slate-300 transition-colors hover:text-emerald-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-accent sm:flex-row-reverse"
                >
                  <Send className="h-3.5 w-3.5 shrink-0 text-slate-500 transition-colors group-hover:text-emerald-accent" />
                  {t("foot.telegram")}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-slate-800/80 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {COPYRIGHT_YEAR} ColList</p>
          <p>{t("foot.tagline")}</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
