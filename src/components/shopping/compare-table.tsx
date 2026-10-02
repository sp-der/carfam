"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { CloseIcon } from "@/components/icons";
import { VehicleImage } from "@/components/vehicles/vehicle-image";
import { formatMiles } from "@/components/vehicles/vehicle-card";
import { COMPARE_LIMIT, removeFromList, toggleInList, useList } from "./shopping-store";
import { UndoNotice, useClearWithUndo } from "./use-clear-with-undo";
import { useVehicleSummaries } from "./use-vehicle-summaries";

const noop = () => () => {};

/** Side-by-side comparison of up to three vehicles; rows come from the same spec projection as detail pages. */
export function CompareTable() {
  const hydrated = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
  const ids = useList("compare");
  const { loading, vehicles, unavailable, error } = useVehicleSummaries(ids);
  const { clear, undo, cleared } = useClearWithUndo("compare");

  if (!hydrated || loading) return <p className="text-slate">Loading comparison…</p>;
  if (error) return <p className="font-semibold text-danger">The comparison couldn’t load. Refresh to try again.</p>;
  if (vehicles.length === 0) {
    return (
      <div className="space-y-4">
        {cleared ? <UndoNotice message="Comparison cleared." onUndo={undo} /> : null}
        <div className="rounded-md border border-line p-6 sm:p-8">
          <h2 className="font-display text-2xl">Pick vehicles to compare</h2>
          <p className="mt-2 max-w-prose text-slate">
            Choose Compare on up to {COMPARE_LIMIT} vehicles in the inventory, then come back here to see them side by
            side.
          </p>
          <Link
            href="/pre-owned-cars"
            className="mt-6 inline-flex min-h-12 items-center rounded-md bg-pink px-5 font-bold text-ink hover:bg-pink-soft"
          >
            Browse inventory
          </Link>
        </div>
      </div>
    );
  }

  const rowLabels = vehicles[0].specs.map((s) => s.label);
  const cell = "border-b border-line px-3 py-3 align-top";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-slate">
          {vehicles.length < 2
            ? "Add another vehicle from the inventory to compare."
            : `Comparing ${vehicles.length} vehicles.`}
        </p>
        <button type="button" onClick={clear} className="min-h-11 px-2 text-sm font-bold text-cyan-ink hover:underline">
          Clear comparison
        </button>
      </div>
      {unavailable.length ? (
        <p className="mt-3 rounded-md bg-amber-bg px-4 py-3 text-sm text-amber">
          {unavailable.length === 1
            ? "One vehicle in your comparison is no longer available and was left out."
            : `${unavailable.length} vehicles in your comparison are no longer available and were left out.`}{" "}
          <button type="button" onClick={() => removeFromList("compare", unavailable)} className="font-bold underline">
            Remove
          </button>
        </p>
      ) : null}

      <div
        className="scroll-x mt-6 -mx-4 px-4 sm:mx-0 sm:px-0"
        tabIndex={0}
        role="region"
        aria-label="Comparison table"
      >
        <table className="w-full min-w-[40rem] table-fixed border-collapse text-left text-[0.9375rem]">
          <caption className="sr-only">Vehicle comparison</caption>
          <thead>
            <tr>
              <th scope="col" className="w-36 px-3 pb-3 text-sm font-semibold text-slate">
                <span className="sr-only">Detail</span>
              </th>
              {vehicles.map((v) => (
                <th key={v.id} scope="col" className="px-3 pb-3 align-top font-normal">
                  <div className="overflow-hidden rounded-[3px]">
                    <VehicleImage image={v.image} title={v.title} sizes="(min-width: 1024px) 320px, 45vw" />
                  </div>
                  <Link href={v.href} className="mt-2 block font-bold leading-snug hover:text-cyan-ink">
                    {v.year} {v.make} {v.model} {v.trim}
                  </Link>
                  <button
                    type="button"
                    onClick={() => toggleInList("compare", v.routeId)}
                    className="mt-1 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-slate hover:text-ink"
                    aria-label={`Remove ${v.title} from comparison`}
                  >
                    <CloseIcon className="size-4" />
                    Remove
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row" className={`${cell} font-semibold text-slate`}>
                Sale price
              </th>
              {vehicles.map((v) => (
                <td key={v.id} className={cell}>
                  <span className="font-display text-xl tabular">{v.salePriceLabel}</span>
                  <span className="block text-xs text-slate">{v.feeSummary}</span>
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row" className={`${cell} font-semibold text-slate`}>
                Mileage
              </th>
              {vehicles.map((v) => (
                <td key={v.id} className={`${cell} tabular`}>
                  {formatMiles(v.mileage)}
                </td>
              ))}
            </tr>
            {rowLabels.map((label, row) => (
              <tr key={label}>
                <th scope="row" className={`${cell} font-semibold text-slate`}>
                  {label}
                </th>
                {vehicles.map((v) => (
                  <td key={v.id} className={`${cell} ${v.specs[row]?.value == null ? "text-slate" : ""}`}>
                    {v.specs[row]?.value ?? "Not listed"}
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <th scope="row" className={`${cell} font-semibold text-slate`}>
                Stock
              </th>
              {vehicles.map((v) => (
                <td key={v.id} className={`${cell} tabular`} translate="no">
                  {v.stockNumber}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
