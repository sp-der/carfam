import { describe, expect, it } from "vitest";
import { CREDIT_SCENARIOS, FINANCE_TERMS, parseCalculatorAmount } from "@/lib/finance-scenarios";
import { estimateMonthlyPayment } from "@/lib/inventory/pricing";

describe("Illustrative finance calculator", () => {
  it("covers the missing below-580 range and preserves historical example rates", () => {
    expect(CREDIT_SCENARIOS[0].label).toBe("Below 580");
    expect(CREDIT_SCENARIOS.map((item) => item.apr)).toEqual([20.9, 18.9, 11.9, 5.9, 4.9]);
    expect(FINANCE_TERMS).toContain(60);
  });
  it("parses money into cents and preserves invalid/negative values for validation", () => {
    expect(parseCalculatorAmount("$20,000.25")).toBe(2000025);
    expect(parseCalculatorAmount("")).toBe(0);
    expect(parseCalculatorAmount("bad input")).toBeNaN();
    expect(parseCalculatorAmount("-100")).toBe(-10000);
  });
  it("subtracts down payment and trade-in once before estimating", () => {
    const estimate = estimateMonthlyPayment({priceCents: parseCalculatorAmount("20000"), downPaymentCents: parseCalculatorAmount("2000"), tradeValueCents: parseCalculatorAmount("3000"), aprPercent: 0, termMonths: 60});
    expect(estimate).toEqual({ok:true,principalCents:1500000,monthlyCents:25000});
  });
  it("example selection produces calculations, never an approval result", () => {
    const estimate = estimateMonthlyPayment({priceCents:2000000,downPaymentCents:200000,tradeValueCents:300000,aprPercent:CREDIT_SCENARIOS[4].apr,termMonths:60});
    expect(estimate).toEqual({ok:true,principalCents:1500000,monthlyCents:28238});
  });
});
