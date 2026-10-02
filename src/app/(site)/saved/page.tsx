import type { Metadata } from "next";
import { SavedVehicles } from "@/components/shopping/saved-vehicles";

export const metadata: Metadata = { title: "Saved vehicles", alternates: { canonical: "/saved" } };

export default function SavedPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
      <h1 className="font-display text-3xl sm:text-5xl">Saved vehicles</h1>
      <p className="mt-2 text-slate">Saved on this device only. Prices update from the current inventory.</p>
      <div className="mt-8">
        <SavedVehicles />
      </div>
    </div>
  );
}
