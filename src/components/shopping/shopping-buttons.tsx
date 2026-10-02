"use client";

import { useState } from "react";
import { CompareIcon, HeartIcon } from "@/components/icons";
import { COMPARE_LIMIT, toggleInList, useList } from "./shopping-store";

interface Props {
  routeId: string;
  title: string;
  /** "icon": round overlay button on card images; "full": labeled button on detail pages. */
  variant?: "icon" | "full";
}

export function SaveButton({ routeId, title, variant = "icon" }: Props) {
  const saved = useList("saved").includes(routeId);
  const label = saved ? `Remove ${title} from saved` : `Save ${title}`;
  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={() => toggleInList("saved", routeId)}
        aria-pressed={saved}
        aria-label={label}
        className="grid size-11 place-items-center rounded-full bg-paper/95 text-ink shadow-[0_1px_3px_rgb(0_0_0/0.25)] transition-colors hover:text-pink aria-pressed:text-pink"
      >
        <HeartIcon filled={saved} className="size-5" />
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={() => toggleInList("saved", routeId)}
      aria-pressed={saved}
      className="inline-flex min-h-11 items-center gap-2 rounded-md border border-line px-3 text-sm font-semibold transition-colors hover:border-ink aria-pressed:border-pink aria-pressed:text-ink"
    >
      <HeartIcon filled={saved} className={`size-4 ${saved ? "text-pink" : ""}`} />
      {saved ? "Saved" : "Save"}
    </button>
  );
}

export function CompareButton({ routeId, title, variant = "icon" }: Props) {
  const list = useList("compare");
  const selected = list.includes(routeId);
  const [full, setFull] = useState(false);

  const onClick = () => {
    const ok = toggleInList("compare", routeId);
    setFull(!ok);
    if (!ok) window.setTimeout(() => setFull(false), 4000);
  };

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={onClick}
        aria-pressed={selected}
        aria-label={variant === "icon" ? `Compare ${title}` : undefined}
        className={
          variant === "icon"
            ? "inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 text-sm font-semibold text-slate transition-colors hover:text-ink aria-pressed:text-cyan-ink"
            : "inline-flex min-h-11 items-center gap-2 rounded-md border border-line px-3 text-sm font-semibold transition-colors hover:border-ink aria-pressed:border-cyan-ink aria-pressed:text-cyan-ink"
        }
      >
        <CompareIcon className="size-4" />
        {selected ? "Comparing" : "Compare"}
      </button>
      <span role="status" className="sr-only">
        {full ? `Comparison holds ${COMPARE_LIMIT} vehicles. Remove one to add ${title}.` : ""}
      </span>
      {full ? (
        <span className="absolute bottom-full right-0 z-10 mb-1 w-52 rounded-md bg-graphite px-3 py-2 text-xs text-paper shadow-lg">
          Comparison holds {COMPARE_LIMIT} vehicles. Remove one first.
        </span>
      ) : null}
    </span>
  );
}
