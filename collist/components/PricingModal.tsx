"use client";

import { Check, CreditCard, Lock, Minus, Sparkles, X } from "lucide-react";
import { useMemo, useState } from "react";

import { useLanguage, type TranslationKey } from "@/context/LanguageContext";

const EXIT_MS = 180;

/** Prices live here so they can be changed without touching the layout. */
const PRICE_MONTHLY = 9;
const PRICE_YEARLY = 89;
/** Derived, so the badge can never disagree with the prices above. */
const SAVING_PERCENT = Math.round((1 - PRICE_YEARLY / (PRICE_MONTHLY * 12)) * 100);

type Billing = "monthly" | "yearly";
type Step = "plans" | "checkout";

/** Feature matrix. `pro` marks a line Basic does not get. */
const FEATURES: { key: TranslationKey; descKey?: TranslationKey; basic: boolean; proOnly?: boolean }[] = [
  { key: "feat.polish", descKey: "feat.polishDesc", basic: false, proOnly: true },
  { key: "feat.uniSearch", descKey: "feat.uniSearchDesc", basic: false, proOnly: true },
  { key: "feat.aidAudit", descKey: "feat.aidAuditDesc", basic: false, proOnly: true },
  { key: "feat.matrix15", descKey: "feat.matrix15Desc", basic: false, proOnly: true },
  { key: "feat.matrix8", basic: true },
  { key: "feat.diagnostic", basic: true },
  { key: "feat.roadmap", basic: true },
  { key: "feat.directory", basic: true },
  { key: "feat.vibe", basic: true },
  { key: "feat.export", basic: true },
  { key: "feat.bilingual", basic: true },
];

export function PricingModal({ onClose }: { onClose: () => void }) {
  const { t } = useLanguage();
  const [billing, setBilling] = useState<Billing>("yearly");
  const [step, setStep] = useState<Step>("plans");
  const [closing, setClosing] = useState(false);

  function requestClose() {
    setClosing(true);
    window.setTimeout(onClose, EXIT_MS);
  }

  const price = billing === "monthly" ? PRICE_MONTHLY : PRICE_YEARLY;

  return (
    <div
      className={`fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-slate-950/75 p-4 backdrop-blur-sm transition-opacity duration-200 ${
        closing ? "opacity-0" : "opacity-100"
      }`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("pay.title")}
        className="my-auto w-full max-w-4xl rounded-2xl border border-slate-800 bg-slate-950/90 p-6 shadow-2xl backdrop-blur-2xl sm:p-8"
      >
        <header className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl text-slate-50 sm:text-2xl">{t("pay.title")}</h2>
            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-slate-400">
              {t("pay.subtitle")}
            </p>
          </div>
          <button
            type="button"
            onClick={requestClose}
            aria-label={t("exp.close")}
            className="cursor-pointer rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-800/60 hover:text-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {step === "plans" ? (
          <>
            <BillingToggle billing={billing} onChange={setBilling} />

            <div className="mt-7 grid gap-4 lg:grid-cols-2">
              <PlanCard
                name={t("pay.basic")}
                description={t("pay.basicDesc")}
                priceLine={t("pay.free")}
                priceNote={t("pay.forever")}
                current
              />
              <PlanCard
                name={t("pay.pro")}
                description={t("pay.proDesc")}
                priceLine={`$${price}`}
                priceNote={
                  billing === "monthly"
                    ? t("pay.perMonth")
                    : `${t("pay.billedYearly")} · $${(PRICE_YEARLY / 12).toFixed(2)} ${t("pay.perMonth")}`
                }
                highlighted
                action={
                  <button
                    type="button"
                    onClick={() => setStep("checkout")}
                    className="mt-5 w-full cursor-pointer rounded-full bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 transition-colors hover:bg-emerald-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-accent"
                  >
                    {t("pay.upgrade")}
                  </button>
                }
              />
            </div>

            <section className="mt-8">
              <h3 className="text-xs tracking-[0.15em] text-slate-500 uppercase">
                {t("pay.compare")}
              </h3>
              <div className="mt-4 overflow-hidden rounded-xl border border-slate-800">
                {/* Column headers: without them the two tick columns are unlabelled. */}
                <div className="flex items-center gap-4 border-b border-slate-800/60 bg-slate-900/60 px-4 py-2">
                  <span className="min-w-0 flex-1" />
                  <span className="flex shrink-0 items-center gap-6 text-[0.6rem] tracking-wide text-slate-500 uppercase">
                    <span className="w-4 text-center">{t("pay.basic")}</span>
                    <span className="w-4 text-center text-emerald-accent">{t("pay.pro")}</span>
                  </span>
                </div>
                <ul className="divide-y divide-slate-800/60">
                  {FEATURES.map((feature) => (
                    <FeatureRow key={feature.key} feature={feature} />
                  ))}
                </ul>
              </div>
            </section>
          </>
        ) : (
          <Checkout
            price={price}
            billing={billing}
            onBack={() => setStep("plans")}
          />
        )}
      </div>
    </div>
  );
}

function BillingToggle({
  billing,
  onChange,
}: {
  billing: Billing;
  onChange: (next: Billing) => void;
}) {
  const { t } = useLanguage();
  return (
    <div className="mt-6 flex items-center justify-center gap-2">
      <div
        role="radiogroup"
        aria-label={t("pay.compare")}
        className="inline-flex rounded-full border border-slate-800 bg-slate-900/60 p-1"
      >
        {(["monthly", "yearly"] as Billing[]).map((option) => {
          const active = billing === option;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(option)}
              className={`cursor-pointer rounded-full px-5 py-1.5 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-accent ${
                active ? "bg-emerald-accent/15 text-emerald-accent" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {t(option === "monthly" ? "pay.monthly" : "pay.yearly")}
            </button>
          );
        })}
      </div>
      <span className="rounded-full border border-amber-highlight/30 bg-amber-highlight/10 px-2.5 py-1 text-[0.6rem] font-semibold tracking-wide text-amber-highlight uppercase">
        {t("pay.save")} {SAVING_PERCENT}%
      </span>
    </div>
  );
}

function PlanCard({
  name,
  description,
  priceLine,
  priceNote,
  highlighted = false,
  current = false,
  action,
}: {
  name: string;
  description: string;
  priceLine: string;
  priceNote: string;
  highlighted?: boolean;
  current?: boolean;
  action?: React.ReactNode;
}) {
  const { t } = useLanguage();
  return (
    <article
      className={`flex flex-col rounded-xl border p-6 ${
        highlighted
          ? "border-emerald-accent/50 bg-emerald-accent/5 shadow-[0_0_40px_-16px_rgba(16,185,129,0.5)]"
          : "border-slate-800 bg-slate-900/50"
      }`}
    >
      <div className="flex items-center gap-2">
        {highlighted && <Sparkles className="h-4 w-4 text-emerald-accent" />}
        <h3 className="font-display text-lg text-slate-50">{name}</h3>
      </div>
      <p className="mt-1.5 text-sm text-slate-400">{description}</p>

      <p className="mt-5 flex items-baseline gap-2">
        <span className="font-display text-3xl text-slate-50">{priceLine}</span>
        <span className="text-xs text-slate-500">{priceNote}</span>
      </p>

      {action}
      {current && (
        <p className="mt-5 rounded-full border border-slate-800 py-2.5 text-center text-sm text-slate-500">
          {t("pay.current")}
        </p>
      )}
    </article>
  );
}

function FeatureRow({
  feature,
}: {
  feature: { key: TranslationKey; descKey?: TranslationKey; basic: boolean; proOnly?: boolean };
}) {
  const { t } = useLanguage();
  return (
    <li className="flex items-start gap-4 px-4 py-3">
      <span className="min-w-0 flex-1">
        <span className={`text-sm ${feature.proOnly ? "text-slate-100" : "text-slate-300"}`}>
          {t(feature.key)}
        </span>
        {feature.descKey && (
          <span className="mt-1 block text-xs leading-relaxed text-slate-500">
            {t(feature.descKey)}
          </span>
        )}
      </span>
      <span className="flex shrink-0 items-center gap-6 pt-0.5">
        <Mark on={feature.basic} />
        <Mark on />
      </span>
    </li>
  );
}

function Mark({ on }: { on: boolean }) {
  const { t } = useLanguage();
  const label = t(on ? "pay.included" : "pay.excluded");
  return (
    <span className="w-4 text-center" title={label}>
      <span className="sr-only">{label}</span>
      {on ? (
        <Check className="mx-auto h-4 w-4 text-emerald-accent" aria-hidden />
      ) : (
        <Minus className="mx-auto h-4 w-4 text-slate-700" aria-hidden />
      )}
    </span>
  );
}

/**
 * Checkout surface.
 *
 * Deliberately inert: the card fields are local component state only — never
 * written to context, storage, or any request — and the pay button performs no
 * action. Nothing here can transmit or retain a real card.
 */
function Checkout({
  price,
  billing,
  onBack,
}: {
  price: number;
  billing: Billing;
  onBack: () => void;
}) {
  const { t } = useLanguage();
  const [card, setCard] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");

  const complete = useMemo(
    () =>
      card.replace(/\s/g, "").length >= 15 &&
      expiry.length === 5 &&
      cvc.length >= 3 &&
      name.trim().length > 1 &&
      country.trim().length > 1,
    [card, expiry, cvc, name, country],
  );

  const field =
    "w-full rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2.5 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-emerald-accent/60";

  return (
    <div className="mt-7 grid gap-8 lg:grid-cols-[minmax(0,1fr)_260px]">
      <div>
        <h3 className="flex items-center gap-2 text-xs tracking-[0.15em] text-slate-500 uppercase">
          <CreditCard className="h-3.5 w-3.5" />
          {t("pay.checkout")}
        </h3>

        <div className="mt-4 grid gap-4">
          <label className="block">
            <span className="mb-1.5 block text-xs text-slate-400">{t("pay.card")}</span>
            <input
              inputMode="numeric"
              autoComplete="off"
              value={card}
              placeholder="4242 4242 4242 4242"
              onChange={(e) =>
                setCard(
                  e.target.value
                    .replace(/\D/g, "")
                    .slice(0, 19)
                    .replace(/(.{4})/g, "$1 ")
                    .trim(),
                )
              }
              className={field}
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="mb-1.5 block text-xs text-slate-400">{t("pay.expiry")}</span>
              <input
                inputMode="numeric"
                autoComplete="off"
                value={expiry}
                placeholder="MM/YY"
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
                  setExpiry(digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits);
                }}
                className={field}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs text-slate-400">{t("pay.cvc")}</span>
              <input
                inputMode="numeric"
                autoComplete="off"
                value={cvc}
                placeholder="123"
                onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className={field}
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-xs text-slate-400">{t("pay.name")}</span>
            <input
              autoComplete="off"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={field}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs text-slate-400">{t("pay.country")}</span>
            <input
              autoComplete="off"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className={field}
            />
          </label>
        </div>
      </div>

      <aside className="flex flex-col rounded-xl border border-slate-800 bg-slate-900/50 p-5">
        <p className="text-xs tracking-wide text-slate-500 uppercase">{t("pay.total")}</p>
        <p className="font-display mt-1 text-3xl text-slate-50">${price}</p>
        <p className="text-xs text-slate-500">
          {billing === "monthly" ? t("pay.perMonth") : t("pay.billedYearly")}
        </p>

        <button
          type="button"
          // Intentionally inert: there is no payment backend behind this.
          onClick={() => undefined}
          disabled={!complete}
          className="mt-5 w-full cursor-pointer rounded-full bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-accent"
        >
          {t("pay.pay")} ${price}
        </button>

        <p className="mt-3 flex items-center justify-center gap-1.5 text-[0.65rem] text-slate-500">
          <Lock className="h-3 w-3" />
          {t("pay.secure")}
        </p>

        <button
          type="button"
          onClick={onBack}
          className="mt-4 cursor-pointer text-xs text-slate-500 transition-colors hover:text-slate-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-accent"
        >
          {t("pay.back")}
        </button>
      </aside>
    </div>
  );
}

export default PricingModal;
