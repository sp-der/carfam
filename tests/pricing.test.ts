import { describe, expect, it } from "vitest";
import {
  dollarsToCents,
  estimateMonthlyPayment,
  feeSummary,
  formatPrice,
  priceBreakdown,
  salePriceCents,
} from "@/lib/inventory/pricing";
import { seedVehicles, vehicleBySource } from "./support/fixtures";

const pricing = { internetPriceCents: 1_999_900, docFeeCents: 8_500, smogFeeCents: 5_000, otherFees: [] };

describe("sale price", () => {
  it("is internet price plus every fee", () => {
    expect(salePriceCents(pricing)).toBe(2_013_400);
    expect(salePriceCents({ ...pricing, otherFees: [{ label: "Dealer add-on", cents: 49_900 }] })).toBe(2_063_300);
  });

  it("matches the captured sale_price for all 127 recon vehicles", () => {
    // Import throws on mismatch; this re-checks the committed seed against known values.
    expect(salePriceCents(vehicleBySource("1449827").pricing)).toBe(2_013_400); // 2020 Cadillac XT5: $20,134
    expect(salePriceCents(vehicleBySource("1581060").pricing)).toBe(1_013_400); // 2013 Accord: $10,134
    for (const v of seedVehicles) {
      expect(salePriceCents(v.pricing)).toBe(v.pricing.internetPriceCents + 8_500 + 5_000);
    }
  });

  it("formats whole dollars without cents and keeps cents otherwise", () => {
    expect(formatPrice(2_013_400)).toBe("$20,134");
    expect(formatPrice(123_450)).toBe("$1,234.50");
    expect(dollarsToCents(19999)).toBe(1_999_900);
    expect(() => dollarsToCents(Number.NaN)).toThrow();
  });

  it("labels fees for cards and breaks them down for the detail page", () => {
    expect(feeSummary(pricing)).toBe("Includes $85 doc + $50 smog fees");
    const breakdown = priceBreakdown(pricing);
    expect(breakdown.lines.map((l) => l.label)).toEqual(["Internet price", "Doc fee", "Smog fee"]);
    expect(breakdown.lines.reduce((s, l) => s + l.cents, 0)).toBe(breakdown.salePriceCents);
  });
});

describe("illustrative payment estimate", () => {
  const base = { priceCents: 2_000_000, downPaymentCents: 0, tradeValueCents: 0, aprPercent: 6, termMonths: 60 };

  it("amortizes a standard loan", () => {
    expect(estimateMonthlyPayment(base)).toEqual({ ok: true, principalCents: 2_000_000, monthlyCents: 38_666 });
  });

  it("handles zero APR", () => {
    expect(estimateMonthlyPayment({ ...base, aprPercent: 0 })).toEqual({
      ok: true,
      principalCents: 2_000_000,
      monthlyCents: 33_333,
    });
  });

  it("returns zero when down payment and trade cover the price", () => {
    expect(estimateMonthlyPayment({ ...base, downPaymentCents: 1_500_000, tradeValueCents: 900_000 })).toEqual({
      ok: true,
      principalCents: 0,
      monthlyCents: 0,
    });
  });

  it("rejects invalid input instead of producing a number", () => {
    expect(estimateMonthlyPayment({ ...base, aprPercent: Number.NaN }).ok).toBe(false);
    expect(estimateMonthlyPayment({ ...base, aprPercent: -1 }).ok).toBe(false);
    expect(estimateMonthlyPayment({ ...base, termMonths: 0 }).ok).toBe(false);
    expect(estimateMonthlyPayment({ ...base, termMonths: 12.5 }).ok).toBe(false);
    expect(estimateMonthlyPayment({ ...base, downPaymentCents: -5 }).ok).toBe(false);
  });
});
