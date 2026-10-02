"use client";

import { useRouter } from "next/navigation";
import { createContext, use, useCallback, useOptimistic, useTransition, type ReactNode } from "react";
import { compactFilters, inventoryHref, type InventoryFilters } from "@/lib/inventory/filters";

/**
 * The inventory URL is the single source of truth. Filter controls call `navigate`, which pushes the
 * canonical URL inside a transition: the server re-renders results, back/forward work natively, and
 * the results region dims while the next page loads.
 */
interface InventoryNav {
  filters: InventoryFilters;
  pending: boolean;
  navigate: (next: InventoryFilters) => void;
}

const Ctx = createContext<InventoryNav | null>(null);

/** Narrowing changes always go back to page 1; contradictory price bounds keep the newer one. */
export function normalizeNext(next: InventoryFilters): InventoryFilters {
  const f = { ...next, page: undefined };
  if (f.priceMin != null && f.priceMax != null && f.priceMin >= f.priceMax) delete f.priceMin;
  if (f.yearMin != null && f.yearMax != null && f.yearMin > f.yearMax) delete f.yearMin;
  return compactFilters(f);
}

export function InventoryNavProvider({ filters, children }: { filters: InventoryFilters; children: ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Controls show the requested filters immediately (e.g. a checkbox stays checked) while the
  // server renders the new results; the URL's filters take over once navigation completes.
  const [optimistic, setOptimistic] = useOptimistic(filters);
  const navigate = useCallback(
    (next: InventoryFilters) => {
      const normalized = normalizeNext(next);
      startTransition(() => {
        setOptimistic(normalized);
        router.push(inventoryHref(normalized), { scroll: false });
      });
    },
    [router, setOptimistic],
  );
  return <Ctx value={{ filters: optimistic, pending, navigate }}>{children}</Ctx>;
}

export function useInventoryNav(): InventoryNav {
  const value = use(Ctx);
  if (!value) throw new Error("useInventoryNav must be used inside InventoryNavProvider");
  return value;
}

export function PendingRegion({ children, className = "" }: { children: ReactNode; className?: string }) {
  const { pending } = useInventoryNav();
  return (
    <div aria-busy={pending} className={`transition-opacity duration-150 ${pending ? "opacity-50" : ""} ${className}`}>
      {children}
    </div>
  );
}
