import type { VehiclePricing } from "./types";

/**
 * Single pricing module for cards, lists, detail pages, search and the chatbot.
 * The budget filter, price sort and every displayed headline price use `salePriceCents`.
 */

export const SALE_PRICE_LABEL = "Sale price";
export const SALE_PRICE_NOTE =
  "Includes doc and smog fees. Excludes tax, registration and other charges.";

export function salePriceCents(p: VehiclePricing): number {
  return (
    p.internetPriceCents +
    p.docFeeCents +
    p.smogFeeCents +
    p.otherFees.reduce((sum, fee) => sum + fee.cents, 0)
  );
}

export function dollarsToCents(dollars: number): number {
  if (!Number.isFinite(dollars)) throw new RangeError(`Invalid dollar amount: ${dollars}`);
  return Math.round(dollars * 100);
}

const wholeDollars = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const exactDollars = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** "$20,134" — whole-dollar amounts drop cents; otherwise "$1,234.50". */
export function formatPrice(cents: number): string {
  return cents % 100 === 0 ? wholeDollars.format(cents / 100) : exactDollars.format(cents / 100);
}

export interface PriceLine {
  label: string;
  cents: number;
}

export interface PriceBreakdown {
  lines: PriceLine[];
  salePriceCents: number;
}

/** Detail-page breakdown: internet price, each fee, then the sale price total. */
export function priceBreakdown(p: VehiclePricing): PriceBreakdown {
  const lines: PriceLine[] = [
    { label: "Internet price", cents: p.internetPriceCents },
    { label: "Doc fee", cents: p.docFeeCents },
    { label: "Smog fee", cents: p.smogFeeCents },
    ...p.otherFees.map((fee) => ({ label: fee.label, cents: fee.cents })),
  ];
  return { lines, salePriceCents: salePriceCents(p) };
}

/** Short fee description for card/list labels, e.g. "Includes $85 doc + $50 smog fees". */
export function feeSummary(p: VehiclePricing): string {
  const parts = [
    `${formatPrice(p.docFeeCents)} doc`,
    `${formatPrice(p.smogFeeCents)} smog`,
    ...p.otherFees.map((fee) => `${formatPrice(fee.cents)} ${fee.label.toLowerCase()}`),
  ];
  return `Includes ${parts.join(" + ")} fees`;
}

export interface PaymentEstimateInput {
  priceCents: number;
  downPaymentCents: number;
  tradeValueCents: number;
  aprPercent: number;
  termMonths: number;
}

export type PaymentEstimate =
  | { ok: true; principalCents: number; monthlyCents: number }
  | { ok: false; reason: string };

/**
 * Illustrative amortized payment. Not a quote: APR is user-selected.
 * Handles zero APR, invalid inputs, and down payment/trade covering the price.
 */
export function estimateMonthlyPayment(input: PaymentEstimateInput): PaymentEstimate {
  const { priceCents, downPaymentCents, tradeValueCents, aprPercent, termMonths } = input;
  const numbers = [priceCents, downPaymentCents, tradeValueCents, aprPercent, termMonths];
  if (numbers.some((n) => !Number.isFinite(n))) return { ok: false, reason: "Enter valid numbers." };
  if (priceCents < 0 || downPaymentCents < 0 || tradeValueCents < 0)
    return { ok: false, reason: "Amounts can't be negative." };
  if (aprPercent < 0 || aprPercent > 50) return { ok: false, reason: "APR must be between 0% and 50%." };
  if (!Number.isInteger(termMonths) || termMonths < 1 || termMonths > 96)
    return { ok: false, reason: "Term must be 1–96 months." };

  const principalCents = Math.max(0, priceCents - downPaymentCents - tradeValueCents);
  if (principalCents === 0) return { ok: true, principalCents: 0, monthlyCents: 0 };

  const monthlyRate = aprPercent / 100 / 12;
  const monthly =
    monthlyRate === 0
      ? principalCents / termMonths
      : (principalCents * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -termMonths));
  return { ok: true, principalCents, monthlyCents: Math.round(monthly) };
}
