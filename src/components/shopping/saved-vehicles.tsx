"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { VehicleCard } from "@/components/vehicles/vehicle-card";
import { removeFromList, useList } from "./shopping-store";
import { UndoNotice, useClearWithUndo } from "./use-clear-with-undo";
import { CompareTray } from "./compare-tray";
import { useVehicleSummaries } from "./use-vehicle-summaries";

const noop = () => () => {};
/** False during server render and hydration, true after: avoids flashing the empty state. */
function useHydrated() {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}

export function SavedVehicles() {
  const hydrated = useHydrated();
  const ids = useList("saved");
  const { loading, vehicles, unavailable, error } = useVehicleSummaries(ids);
  const { clear, undo, cleared } = useClearWithUndo("saved");

  if (!hydrated || loading) {
    return (
      <p className="text-slate" aria-live="polite">
        Loading saved vehicles…
      </p>
    );
  }
  if (error) {
    return <p className="font-semibold text-danger">Saved vehicles couldn’t load. Refresh the page to try again.</p>;
  }
  if (ids.length === 0) {
    return (
      <div className="space-y-4">
        {cleared ? <UndoNotice message="Saved vehicles cleared." onUndo={undo} /> : null}
        <div className="rounded-md border border-line p-6 sm:p-8">
          <h2 className="font-display text-2xl">No saved vehicles yet</h2>
          <p className="mt-2 max-w-prose text-slate">
            Tap the heart on any vehicle to keep it here. Saves stay on this device; there are no customer accounts in
            this demo.
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

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-bold tabular" aria-live="polite">
          {vehicles.length} saved {vehicles.length === 1 ? "vehicle" : "vehicles"}
        </p>
        <button type="button" onClick={clear} className="min-h-11 px-2 text-sm font-bold text-cyan-ink hover:underline">
          Clear saved vehicles
        </button>
      </div>
      {unavailable.length ? (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-md bg-amber-bg px-4 py-3 text-sm">
          <p className="flex-1 text-amber">
            {unavailable.length === 1 ? "1 saved vehicle is" : `${unavailable.length} saved vehicles are`} no longer
            available.
          </p>
          <button
            type="button"
            onClick={() => removeFromList("saved", unavailable)}
            className="min-h-11 font-bold text-ink underline"
          >
            Remove {unavailable.length === 1 ? "it" : "them"}
          </button>
        </div>
      ) : null}
      <ul className="mt-6 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {vehicles.map((v) => (
          <li key={v.id}>
            <VehicleCard card={v} headingLevel={2} />
          </li>
        ))}
      </ul>
      <CompareTray />
    </div>
  );
}
