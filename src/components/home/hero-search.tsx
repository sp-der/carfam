"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { filtersToSearchParams, inventoryHref, type InventoryFilters } from "@/lib/inventory/filters";
import type { BodyType } from "@/lib/inventory/types";

export interface HeroOption {
  value: string;
  label: string;
}

const BUDGETS = [10000, 15000, 20000, 25000, 30000, 40000, 50000];

function toFilters(body: string, make: string, budget: string): InventoryFilters {
  return {
    body: body ? [body as BodyType] : undefined,
    make: make ? [make] : undefined,
    priceMax: budget ? Number(budget) : undefined,
  };
}

/**
 * "Show me [body] from [make] under [budget]" — the homepage search, written as a sentence.
 * Works without JavaScript (GET form). With JavaScript it shows a live match count from the
 * shared search API and navigates to the canonical inventory URL.
 */
export function HeroSearch({
  bodies,
  makes,
  initialTotal,
}: {
  bodies: HeroOption[];
  makes: HeroOption[];
  initialTotal: number;
}) {
  const router = useRouter();
  const id = useId();
  const [body, setBody] = useState("");
  const [make, setMake] = useState("");
  const [budget, setBudget] = useState("");
  // Count results are keyed by query so a stale response never shows for a newer selection.
  const query = filtersToSearchParams(toFilters(body, make, budget)).toString();
  const [result, setResult] = useState<{ query: string; total: number } | null>(null);

  useEffect(() => {
    if (!query) return;
    const controller = new AbortController();
    fetch(`/api/inventory/search?${query}&summary=1`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: { total: number }) => setResult({ query, total: data.total }))
      .catch(() => {
        if (!controller.signal.aborted) setResult({ query, total: -1 });
      });
    return () => controller.abort();
  }, [query]);

  const total = !query ? initialTotal : result?.query === query ? result.total : null;

  const label =
    total == null
      ? "Counting…"
      : total < 0
        ? "Show vehicles"
        : total === 0
          ? "See suggestions"
          : `Show ${total} ${total === 1 ? "vehicle" : "vehicles"}`;

  const slot =
    "slot-select min-h-11 max-w-full cursor-pointer border-b-2 border-cyan bg-transparent pr-[0.8em] font-bold text-cyan transition-colors hover:border-paper focus-visible:border-paper";

  return (
    <form
      action="/pre-owned-cars"
      method="get"
      onSubmit={(e) => {
        e.preventDefault();
        router.push(inventoryHref(toFilters(body, make, budget)));
      }}
      className="max-w-4xl"
      aria-describedby={`${id}-count`}
    >
      <p className="font-wide text-[1.625rem] leading-[1.5] font-semibold text-paper sm:text-4xl sm:leading-[1.45]">
        <label htmlFor={`${id}-body`}>Show me</label>{" "}
        <select id={`${id}-body`} name="body" value={body} onChange={(e) => setBody(e.target.value)} className={slot}>
          <option value="">any vehicle</option>
          {bodies.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>{" "}
        <label htmlFor={`${id}-make`}>from</label>{" "}
        <select id={`${id}-make`} name="make" value={make} onChange={(e) => setMake(e.target.value)} className={slot}>
          <option value="">any make</option>
          {makes.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>{" "}
        <label htmlFor={`${id}-budget`}>under</label>{" "}
        <select
          id={`${id}-budget`}
          name="priceMax"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          className={slot}
        >
          <option value="">any price</option>
          {BUDGETS.map((b) => (
            <option key={b} value={b}>
              ${b.toLocaleString("en-US")}
            </option>
          ))}
        </select>
      </p>
      <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
        <button
          type="submit"
          className="tabular inline-flex min-h-13 min-w-56 items-center justify-center rounded-md bg-pink px-6 text-lg font-bold text-ink transition-colors hover:bg-pink-soft"
        >
          {label}
        </button>
        <p className="sr-only" aria-live="polite">
          {total != null && total >= 0 ? `${total} ${total === 1 ? "vehicle matches" : "vehicles match"}` : ""}
        </p>
        <p id={`${id}-count`} className="text-sm text-fog">
          {total === 0
            ? "Nothing matches all three. Try a higher budget or any make."
            : "Budget uses the sale price, which includes doc and smog fees."}
        </p>
      </div>
    </form>
  );
}
