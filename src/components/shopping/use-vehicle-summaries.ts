"use client";

import { useEffect, useState } from "react";
import type { VehicleSummary } from "@/lib/inventory/public";

type Result = { key: string; vehicles: VehicleSummary[]; unavailable: string[]; error: boolean };

/** Fetch public summaries for device-local route ids (saved / compare). Keyed so stale responses never show. */
export function useVehicleSummaries(ids: readonly string[]) {
  const key = ids.join(",");
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    fetch(`/api/inventory/vehicles?ids=${encodeURIComponent(key)}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: { vehicles: VehicleSummary[]; unavailable: string[] }) =>
        setResult({ key, vehicles: data.vehicles, unavailable: data.unavailable, error: false }),
      )
      .catch(() => {
        if (!controller.signal.aborted) setResult({ key, vehicles: [], unavailable: [], error: true });
      });
    return () => controller.abort();
  }, [key]);

  if (!key) return { loading: false, vehicles: [], unavailable: [], error: false };
  if (result?.key !== key) return { loading: true, vehicles: [], unavailable: [], error: false };
  return { loading: false, ...result };
}
