"use client";

import { useId, useState } from "react";
import Link from "next/link";
import type { FinanceVehicle } from "@/lib/finance";
import { CREDIT_SCENARIOS, FINANCE_TERMS, parseCalculatorAmount } from "@/lib/finance-scenarios";
import { estimateMonthlyPayment, formatPrice } from "@/lib/inventory/pricing";

export function FinanceCalculator({ vehicles }: { vehicles: FinanceVehicle[] }) {
  const prefix = useId();
  const [id, setId] = useState(vehicles[0]?.id ?? "manual");
  const [amount, setAmount] = useState("");
  const [down, setDown] = useState("");
  const [trade, setTrade] = useState("");
  const [apr, setApr] = useState("");
  const [scenario, setScenario] = useState<string | null>(null);
  const [term, setTerm] = useState(60);
  const vehicle = vehicles.find((item) => item.id === id);
  const priceCents = vehicle?.price ?? parseCalculatorAmount(amount);
  const aprPercent = apr.trim() === "" ? null : Number(apr);
  const estimate = aprPercent === null ? null : estimateMonthlyPayment({
    priceCents,
    downPaymentCents: parseCalculatorAmount(down),
    tradeValueCents: parseCalculatorAmount(trade),
    aprPercent,
    termMonths: term,
  });
  const inputClass = "min-h-12 w-full rounded-md border border-line bg-paper px-3 text-base tabular aria-[invalid=true]:border-danger read-only:bg-mist";
  const choiceClass = "min-h-16 rounded-xl border border-line bg-paper p-3 text-center transition-colors hover:border-cyan-ink aria-pressed:border-cyan-ink aria-pressed:bg-cyan-ink aria-pressed:text-paper";

  return (
    <section className="mt-8 space-y-6" aria-label="Estimated payment calculator">
      <div>
        <h2 className="font-display text-3xl">Explore an illustrative payment</h2>
        <p className="mt-3 text-sm leading-relaxed text-slate">
          Choose a vehicle or enter your own starting amount. Try a credit-score
          scenario or your own APR to compare estimated monthly payments.
        </p>
      </div>
      <div className="grid items-start gap-7 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <label className="form-label" htmlFor={`${prefix}-vehicle`}>
            Choose a demo inventory vehicle or enter an amount
          </label>
          <select
            id={`${prefix}-vehicle`}
            className="field-select min-h-12 w-full rounded-md border border-line bg-paper px-3"
            value={id}
            onChange={(event) => {
              if (event.target.value === "manual" && vehicle) setAmount(String(vehicle.price / 100));
              setId(event.target.value);
            }}
          >
            {vehicles.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
            <option value="manual">Enter my own amount</option>
          </select>
          <div>
            <label htmlFor={`${prefix}-amount`} className="mb-2 block text-sm font-semibold">
              Loan amount before down payment / trade-in
            </label>
            <input
              id={`${prefix}-amount`}
              name="startingAmount"
              inputMode="decimal"
              autoComplete="off"
              placeholder="e.g. 20000"
              readOnly={Boolean(vehicle)}
              value={vehicle ? String(vehicle.price / 100) : amount}
              onChange={(event) => setAmount(event.target.value)}
              aria-invalid={!Number.isFinite(priceCents) || priceCents < 0}
              aria-describedby={`${prefix}-amount-hint`}
              className={inputClass}
            />
            <p id={`${prefix}-amount-hint`} className="mt-2 text-xs leading-relaxed text-slate">
              {vehicle ? "Uses the listed sale price including doc and smog fees. Choose ‘Enter my own amount’ above to edit." : "Enter an amount including doc and smog fees, before subtracting down payment or trade-in. Tax and registration are excluded."}
            </p>
          </div>
          <fieldset aria-describedby={`${prefix}-scenarios-hint`}>
            <legend className="mb-3 text-sm font-semibold">Credit-score scenarios · example APRs</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
              {CREDIT_SCENARIOS.map((item) => (
                <button
                  type="button"
                  key={item.label}
                  aria-pressed={scenario === item.label}
                  className={choiceClass}
                  onClick={() => { setScenario(item.label); setApr(String(item.apr)); }}
                >
                  <span className="block text-sm font-bold">{item.label}</span>
                  <span className="mt-1 block text-xs">Example {item.apr}% APR</span>
                </button>
              ))}
            </div>
            <p id={`${prefix}-scenarios-hint`} className="mt-3 text-xs leading-relaxed text-slate">
              Historical examples from the original page, not current lender
              rates. A score range alone does not determine your APR or approval.
              Selecting a scenario does not check your credit.
            </p>
          </fieldset>
          <div>
            <label htmlFor={`${prefix}-apr`} className="mb-2 block text-sm font-semibold">APR you want to try</label>
            <input
              id={`${prefix}-apr`}
              name="apr"
              inputMode="decimal"
              autoComplete="off"
              placeholder="Choose an example above or enter an APR"
              value={apr}
              onChange={(event) => { setApr(event.target.value); setScenario(null); }}
              aria-invalid={aprPercent !== null && (!Number.isFinite(aprPercent) || aprPercent < 0 || aprPercent > 50)}
              className={inputClass}
            />
            <p className="mt-2 text-xs text-slate">This is not a lender rate or an offer. You can change the example APR.</p>
          </div>
          <fieldset>
            <legend className="mb-3 text-sm font-semibold">Payment term</legend>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {FINANCE_TERMS.map((months) => (
                <button type="button" key={months} aria-pressed={term === months} className={choiceClass} onClick={() => setTerm(months)}>
                  <span className="block font-bold">{months}</span><span className="block text-xs">months</span>
                </button>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={`${prefix}-down`} className="mb-2 block text-sm font-semibold">Down payment</label>
              <input id={`${prefix}-down`} name="downPayment" inputMode="decimal" autoComplete="off" placeholder="$0" value={down} onChange={(event) => setDown(event.target.value)} aria-invalid={!Number.isFinite(parseCalculatorAmount(down)) || parseCalculatorAmount(down) < 0} className={inputClass} />
            </div>
            <div>
              <label htmlFor={`${prefix}-trade`} className="mb-2 block text-sm font-semibold">Trade-in value</label>
              <input id={`${prefix}-trade`} name="tradeValue" inputMode="decimal" autoComplete="off" placeholder="$0" value={trade} onChange={(event) => setTrade(event.target.value)} aria-invalid={!Number.isFinite(parseCalculatorAmount(trade)) || parseCalculatorAmount(trade) < 0} className={inputClass} />
            </div>
          </div>
          <p className="text-xs leading-relaxed text-slate">Trade-in value is illustrative. Any outstanding trade-in balance must be accounted for in the actual lender calculation.</p>
        </div>
        <div className="space-y-6 rounded-2xl bg-graphite p-6 text-paper sm:p-8">
          <div aria-live="polite" aria-atomic="true">
            <p className="text-sm text-fog">Estimated monthly payment</p>
            {estimate === null ? <p className="font-display mt-4 text-2xl">Choose an example APR or enter your own.</p> : estimate.ok ? <>
              <p className="font-display mt-3 text-5xl tabular">{formatPrice(Math.round(estimate.monthlyCents / 100) * 100)}<span className="ml-1 font-sans text-lg font-semibold text-fog">/mo</span></p>
              <dl className="mt-7 space-y-3 border-t border-graphite-3 pt-5 text-sm tabular">
                <div className="flex justify-between gap-3"><dt className="text-fog">Starting amount</dt><dd>{formatPrice(priceCents)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-fog">Amount financed</dt><dd>{formatPrice(estimate.principalCents)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-fog">Illustrative APR</dt><dd>{aprPercent}%</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-fog">Term</dt><dd>{term} months</dd></div>
              </dl>
            </> : <p className="mt-4 rounded-lg bg-paper p-4 font-semibold text-danger">{estimate.reason}</p>}
          </div>
          <p className="text-xs leading-relaxed text-fog">
            {vehicle?.disclosure ?? "Illustrative estimate only, not a quote or offer of credit. Uses your entered starting amount including doc and smog fees; no additional fees are automatically added. Tax and registration are excluded. Actual terms depend on the lender."}
          </p>
          <div className="flex flex-col gap-3 border-t border-graphite-3 pt-5">
            <Link href="/contact-us" className="button">Contact dealer</Link>
            <Link href="/finance-your-car/pre-approved" className="button-secondary">Preview financing steps →</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
