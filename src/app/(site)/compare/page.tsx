import type { Metadata } from "next";
import { CompareTable } from "@/components/shopping/compare-table";

export const metadata: Metadata = { title: "Compare vehicles", alternates: { canonical: "/compare" } };

export default function ComparePage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
      <h1 className="font-display text-3xl sm:text-5xl">Compare vehicles</h1>
      <p className="mt-2 text-slate">Up to three vehicles, side by side. Saved on this device only.</p>
      <div className="mt-8">
        <CompareTable />
      </div>
    </div>
  );
}
