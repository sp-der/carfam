"use client";

import Link from "next/link";
import { CompareIcon } from "@/components/icons";
import { COMPARE_LIMIT, useList } from "./shopping-store";
import { UndoNotice, useClearWithUndo } from "./use-clear-with-undo";

/** Bottom bar shown while vehicles are selected for comparison. Leaves room via the spacer below. */
export function CompareTray() {
  const list = useList("compare");
  const { clear, undo, cleared } = useClearWithUndo("compare");
  if (list.length === 0 && !cleared) return null;
  return (
    <>
      <div aria-hidden className="h-20" />
      <div
        role="region"
        aria-label="Comparison"
        className="on-dark fixed inset-x-0 bottom-0 z-30 border-t border-graphite-3 bg-graphite text-paper pb-[env(safe-area-inset-bottom)]"
      >
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
          {list.length === 0 && cleared ? (
            <UndoNotice dark message="Comparison cleared." onUndo={undo} />
          ) : (
            <div className="flex items-center gap-3">
              <CompareIcon className="size-5 shrink-0 text-cyan" />
              <p className="flex-1 text-sm">
                <span className="font-bold tabular">
                  {list.length} of {COMPARE_LIMIT}
                </span>{" "}
                selected<span className="hidden sm:inline"> for comparison</span>
              </p>
              <button
                type="button"
                onClick={clear}
                className="min-h-11 rounded-md px-3 text-sm font-semibold text-fog hover:text-paper"
              >
                Clear
              </button>
              <Link
                href="/compare"
                className="inline-flex min-h-11 items-center rounded-md bg-pink px-4 text-sm font-bold text-ink hover:bg-pink-soft"
              >
                Compare{list.length < 2 ? "" : ` ${list.length}`}
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
