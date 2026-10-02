"use client";

import { useId, useState } from "react";
import { dollarsToCents, estimateMonthlyPayment, formatPrice } from "@/lib/inventory/pricing";

const TERMS = [24, 36, 48, 60, 72, 84];

function parseDollars(raw: string): number {
  if (raw.trim() === "") return 0;
  const n = Number(raw.replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

/**
 * Illustrative payment estimate. Starts from the sale price (doc and smog fees included).
 * APR is chosen by the shopper; there are no lender presets and nothing is a quote.
 */
export function PaymentEstimator({
  salePriceCents,
  disclosure,
}: {
  salePriceCents: number;
  disclosure: string;
}) {
  const id = useId();
  const [down, setDown] = useState("");
  const [trade, setTrade] = useState("");
  const [apr, setApr] = useState("");
  const [term, setTerm] = useState(60);

  const downN = parseDollars(down);
  const tradeN = parseDollars(trade);
  const aprN = apr.trim() === "" ? null : Number(apr.replace(/[%\s]/g, ""));
  const estimate =
    aprN == null
      ? null
      : estimateMonthlyPayment({
          priceCents: salePriceCents,
          downPaymentCents: Number.isFinite(downN) ? dollarsToCents(downN) : NaN,
          tradeValueCents: Number.isFinite(tradeN) ? dollarsToCents(tradeN) : NaN,
          aprPercent: aprN,
          termMonths: term,
        });

  const input =
    "min-h-12 w-full rounded-md border border-line bg-paper px-3 text-base tabular aria-[invalid=true]:border-danger";

  return (
    <div className="grid gap-8 rounded-md border border-line p-5 sm:p-7 md:grid-cols-[1fr_1fr]">
      <form className="grid gap-4" onSubmit={(e) => e.preventDefault()} noValidate>
        <div>
          <p className="text-sm text-slate">Sale price (starting point)</p>
          <p className="font-display text-2xl tabular">{formatPrice(salePriceCents)}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={`${id}-down`} className="mb-1 block text-sm font-semibold">
              Down payment
            </label>
            <input
              id={`${id}-down`}
              name="downPayment"
              inputMode="decimal"
              autoComplete="off"
              placeholder="$0"
              value={down}
              onChange={(e) => setDown(e.target.value)}
              aria-invalid={!Number.isFinite(downN)}
              className={input}
            />
          </div>
          <div>
            <label htmlFor={`${id}-trade`} className="mb-1 block text-sm font-semibold">
              Trade-in value
            </label>
            <input
              id={`${id}-trade`}
              name="tradeValue"
              inputMode="decimal"
              autoComplete="off"
              placeholder="$0"
              value={trade}
              onChange={(e) => setTrade(e.target.value)}
              aria-invalid={!Number.isFinite(tradeN)}
              className={input}
            />
          </div>
          <div>
            <label htmlFor={`${id}-apr`} className="mb-1 block text-sm font-semibold">
              APR you want to try
            </label>
            <input
              id={`${id}-apr`}
              name="apr"
              inputMode="decimal"
              autoComplete="off"
              placeholder="e.g. 7.5"
              value={apr}
              onChange={(e) => setApr(e.target.value)}
              aria-describedby={`${id}-apr-hint`}
              aria-invalid={estimate?.ok === false}
              className={input}
            />
          </div>
          <div>
            <label htmlFor={`${id}-term`} className="mb-1 block text-sm font-semibold">
              Term
            </label>
            <select
              id={`${id}-term`}
              name="termMonths"
              value={term}
              onChange={(e) => setTerm(Number(e.target.value))}
              className={`field-select ${input}`}
            >
              {TERMS.map((t) => (
                <option key={t} value={t}>
                  {t} months
                </option>
              ))}
            </select>
          </div>
        </div>
        <p id={`${id}-apr-hint`} className="text-xs text-slate">
          Enter any APR to explore. This is not a lender rate or an offer.
        </p>
      </form>

      <div className="flex flex-col justify-between gap-6 rounded-md bg-mist p-5 sm:p-6" aria-live="polite">
        <div>
          <p className="text-sm font-semibold text-slate">Illustrative monthly payment</p>
          {estimate == null ? (
            <p className="mt-2 text-lg text-slate">Enter an APR to see an estimate.</p>
          ) : estimate.ok ? (
            <>
              <p className="font-display mt-1 text-4xl tabular">
                {formatPrice(Math.round(estimate.monthlyCents / 100) * 100)}
                <span className="font-sans text-base font-semibold text-slate">/mo</span>
              </p>
              <p className="mt-2 text-sm text-slate tabular">
                Amount financed {formatPrice(estimate.principalCents)} over {term} months at {aprN}% APR
              </p>
            </>
          ) : (
            <p className="mt-2 font-semibold text-danger">{estimate.reason}</p>
          )}
        </div>
        <p className="text-xs leading-relaxed text-slate">{disclosure}</p>
      </div>
    </div>
  );
}
