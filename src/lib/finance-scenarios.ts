/** Historical examples from the supplied page, never current lender offers. */
export const CREDIT_SCENARIOS = [
  { label: "Below 580", apr: 20.9 },
  { label: "580–619", apr: 18.9 },
  { label: "620–679", apr: 11.9 },
  { label: "680–779", apr: 5.9 },
  { label: "780 and above", apr: 4.9 },
] as const;
export const FINANCE_TERMS = [24, 36, 48, 60, 72, 84] as const;

export function parseCalculatorAmount(raw: string): number {
  if (raw.trim() === "") return 0;
  const amount = Number(raw.replace(/[$,\s]/g, ""));
  return Number.isFinite(amount) ? Math.round(amount * 100) : NaN;
}
