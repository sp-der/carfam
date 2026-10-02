"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";

type Category = "exterior" | "interior" | "safety";
const LABELS: Record<Category, string> = { exterior: "Exterior", interior: "Interior", safety: "Safety" };
const INITIAL = 12;

/** Equipment rows from the source listing, in Exterior / Interior / Safety tabs. Long lists collapse. */
export function EquipmentTabs({ equipment }: { equipment: Record<Category, string[]> }) {
  const id = useId();
  const tabs = (Object.keys(LABELS) as Category[]).filter((c) => equipment[c].length > 0);
  const [active, setActive] = useState<Category>(tabs[0] ?? "exterior");
  const [expanded, setExpanded] = useState(false);
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  if (tabs.length === 0) return <p className="text-slate">No equipment list was captured for this vehicle.</p>;

  const select = (c: Category) => {
    setActive(c);
    setExpanded(false);
  };
  const onKey = (e: KeyboardEvent) => {
    const i = tabs.indexOf(active);
    const next =
      e.key === "ArrowRight" ? tabs[(i + 1) % tabs.length] : e.key === "ArrowLeft" ? tabs[(i - 1 + tabs.length) % tabs.length] : null;
    if (!next) return;
    e.preventDefault();
    select(next);
    refs.current[next]?.focus();
  };

  const rows = equipment[active];
  const visible = expanded ? rows : rows.slice(0, INITIAL);

  return (
    <div>
      <div role="tablist" aria-label="Equipment" className="flex gap-1 border-b border-line" onKeyDown={onKey}>
        {tabs.map((c) => (
          <button
            key={c}
            ref={(el) => {
              refs.current[c] = el;
            }}
            type="button"
            role="tab"
            id={`${id}-tab-${c}`}
            aria-selected={active === c}
            aria-controls={`${id}-panel`}
            tabIndex={active === c ? 0 : -1}
            onClick={() => select(c)}
            className="-mb-px min-h-12 border-b-3 border-transparent px-4 font-bold text-slate hover:text-ink aria-selected:border-cyan-ink aria-selected:text-ink"
          >
            {LABELS[c]} <span className="font-normal tabular">({equipment[c].length})</span>
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${active}`} className="pt-4">
        <ul className="grid gap-x-8 sm:grid-cols-2">
          {visible.map((row, i) => {
            const colon = row.indexOf(": ");
            return (
              <li key={`${row}-${i}`} className="border-b border-line py-2.5 text-[0.9375rem]">
                {colon > 0 ? (
                  <>
                    <span className="text-slate">{row.slice(0, colon)}</span>
                    <span className="block font-medium">{row.slice(colon + 2)}</span>
                  </>
                ) : (
                  row
                )}
              </li>
            );
          })}
        </ul>
        {rows.length > INITIAL ? (
          <button
            type="button"
            onClick={() => setExpanded((x) => !x)}
            aria-expanded={expanded}
            className="mt-4 min-h-11 font-bold text-cyan-ink hover:underline"
          >
            {expanded ? "Show fewer" : `Show all ${rows.length} ${LABELS[active].toLowerCase()} features`}
          </button>
        ) : null}
      </div>
    </div>
  );
}
