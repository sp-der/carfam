"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "@/components/icons";
import type { InventoryFilters } from "@/lib/inventory/filters";
import type { FacetOption, InventoryFacets } from "@/lib/inventory/search";
import {
  branchPaths,
  branchTrunk,
  BRANCH_ROW,
  BRANCH_PAD,
  BRANCH_INDENT,
} from "./branch-paths";
import "./branched-filters.css";

type ListKey =
  | "make"
  | "model"
  | "body"
  | "fuel"
  | "drivetrain"
  | "transmission"
  | "exteriorColor"
  | "interiorColor";

const PRICE_STEPS = [
  5000, 10000, 15000, 20000, 25000, 30000, 40000, 50000, 75000, 100000,
];
const MILEAGE_STEPS = [30000, 50000, 75000, 100000, 150000];
const MPG_STEPS = [20, 25, 30, 35, 40];
const money = (n: number) => `$${n.toLocaleString("en-US")}`;

/** Facet options plus any selected values that currently have no matches (so they can be unchecked). */
function withSelected(
  options: FacetOption[],
  selected: readonly string[] | undefined,
): FacetOption[] {
  const missing = (selected ?? [])
    .filter(
      (s) => !options.some((o) => o.value.toLowerCase() === s.toLowerCase()),
    )
    .map((s) => ({ value: s, label: s, count: 0 }));
  return [...options, ...missing];
}

function Group({
  title,
  active,
  defaultOpen,
  children,
}: {
  title: string;
  active: number;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const bodyId = useId();
  // A changed selection count (including URL/chat changes) reveals the group again.
  const [collapsedAt, setCollapsedAt] = useState<number | null>(() =>
    defaultOpen || active > 0 ? null : active,
  );
  const isOpen = collapsedAt !== active;
  return (
    <div
      className="branched-filter-group"
      data-open={isOpen ? "" : undefined}
      data-active={active > 0 ? "" : undefined}
    >
      <button
        type="button"
        className="branched-filter-head"
        aria-expanded={isOpen}
        aria-controls={bodyId}
        onClick={() => setCollapsedAt(isOpen ? active : null)}
      >
        <span>
          {title}
          {active > 0 ? (
            <span className="ml-2 rounded-full bg-cyan-ink px-2 py-0.5 text-xs font-bold text-paper tabular">
              {active}
            </span>
          ) : null}
        </span>
        <ChevronDown className="size-4 text-slate" />
      </button>
      <div
        id={bodyId}
        className="branched-filter-body"
        inert={!isOpen}
        aria-hidden={!isOpen}
      >
        <div className="branched-filter-fold">
          <div className="branched-filter-content">{children}</div>
        </div>
      </div>
    </div>
  );
}

function CheckList({
  name,
  options,
  selected,
  onToggle,
  initialVisible = 8,
}: {
  name: string;
  options: FacetOption[];
  selected: readonly string[] | undefined;
  onToggle: (value: string, checked: boolean) => void;
  initialVisible?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const isChecked = (v: string) =>
    (selected ?? []).some((s) => s.toLowerCase() === v.toLowerCase());
  // Selected options stay visible even when the list is collapsed.
  const visible = expanded
    ? options
    : options.filter((o, i) => i < initialVisible || isChecked(o.value));
  const hidden = options.length - visible.length;
  if (options.length === 0)
    return (
      <p className="px-1 text-sm text-slate">
        No options match the other filters.
      </p>
    );
  return (
    <fieldset>
      <legend className="sr-only">{name}</legend>
      <div className="branched-filter-tree">
        <svg
          className="branched-filter-lines"
          width={BRANCH_INDENT}
          height={BRANCH_PAD * 2 + visible.length * BRANCH_ROW}
          aria-hidden="true"
        >
          <path
            className="branched-filter-base"
            d={branchTrunk(visible.length)}
          />
          {visible.map((option, index) => {
            const paths = branchPaths(index);
            return (
              <g key={option.value}>
                <path className="branched-filter-base" d={paths.base} />
                <path
                  className="branched-filter-reach"
                  d={paths.reach}
                  style={{
                    strokeDasharray: paths.length,
                    strokeDashoffset: isChecked(option.value)
                      ? 0
                      : paths.length,
                  }}
                />
              </g>
            );
          })}
        </svg>
        <ul>
          {visible.map((o) => {
            const checked = isChecked(o.value);
            return (
              <li key={o.value}>
                <label
                  className="branched-filter-option"
                  data-active={checked ? "" : undefined}
                >
                  <input
                    type="checkbox"
                    name={name}
                    value={o.value}
                    checked={checked}
                    onChange={(e) => onToggle(o.value, e.target.checked)}
                    disabled={!checked && o.count === 0}
                    className="size-5 shrink-0 accent-cyan-ink"
                  />
                  <span className="min-w-0 flex-1 break-words text-sm leading-tight">
                    {o.label}
                  </span>
                  <span className="text-sm text-slate tabular">{o.count}</span>
                </label>
              </li>
            );
          })}
        </ul>
      </div>
      {hidden > 0 || expanded ? (
        <button
          type="button"
          onClick={() => setExpanded((x) => !x)}
          aria-expanded={expanded}
          className="mt-1 min-h-10 px-1 text-sm font-bold text-cyan-ink hover:underline"
        >
          {expanded ? "Show fewer" : `Show all ${options.length}`}
        </button>
      ) : null}
    </fieldset>
  );
}

function RangeSelect({
  id,
  label,
  value,
  options,
  anyLabel,
  onChange,
  format = String,
}: {
  id: string;
  label: string;
  value: number | undefined;
  options: { value: number; label: string }[];
  anyLabel: string;
  onChange: (value: number | undefined) => void;
  /** Label for a current value that isn't one of the presets (URLs and the chatbot can set any value). */
  format?: (value: number) => string;
}) {
  if (value != null && !options.some((o) => o.value === value)) {
    options = [...options, { value, label: format(value) }].sort(
      (a, b) => a.value - b.value,
    );
  }
  return (
    <div className="min-w-0 flex-1">
      <label htmlFor={id} className="mb-1 block text-sm text-slate">
        {label}
      </label>
      <select
        id={id}
        name={id}
        value={value ?? ""}
        onChange={(e) =>
          onChange(e.target.value ? Number(e.target.value) : undefined)
        }
        className="field-select min-h-11 w-full rounded-md border border-line bg-paper pl-3 text-base"
      >
        <option value="">{anyLabel}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function FilterPanel({
  idPrefix,
  filters,
  facets,
  onChange,
}: {
  idPrefix: string;
  filters: InventoryFilters;
  facets: InventoryFacets;
  onChange: (next: InventoryFilters) => void;
}) {
  const toggle = (key: ListKey) => (value: string, checked: boolean) => {
    const current = (filters[key] as string[] | undefined) ?? [];
    const next = checked
      ? [...current, value]
      : current.filter((v) => v.toLowerCase() !== value.toLowerCase());
    const patch: InventoryFilters = { ...filters, [key]: next };
    // Models only make sense for the selected makes; drop models whose make was unchecked.
    if (key === "make" && !checked) patch.model = undefined;
    onChange(patch);
  };
  const set = (patch: InventoryFilters) => onChange({ ...filters, ...patch });
  const count = (key: ListKey) =>
    (filters[key] as string[] | undefined)?.length ?? 0;
  const years = facets.year.map((y) => ({
    value: Number(y.value),
    label: y.value,
  }));

  return (
    <div className="branched-filters">
      <Group title="Make" active={count("make")} defaultOpen>
        <CheckList
          name="Make"
          options={withSelected(facets.make, filters.make)}
          selected={filters.make}
          onToggle={toggle("make")}
        />
      </Group>

      {filters.make?.length || filters.model?.length ? (
        <Group title="Model" active={count("model")} defaultOpen>
          <CheckList
            name="Model"
            options={withSelected(facets.model, filters.model)}
            selected={filters.model}
            onToggle={toggle("model")}
          />
        </Group>
      ) : null}

      <Group title="Body style" active={count("body")} defaultOpen>
        <CheckList
          name="Body style"
          options={withSelected(facets.body, filters.body)}
          selected={filters.body}
          onToggle={toggle("body")}
        />
        {facets.unknown.body > 0 && !filters.body?.length ? (
          <p className="mt-2 px-1 text-xs text-slate">
            {facets.unknown.body}{" "}
            {facets.unknown.body === 1 ? "vehicle has" : "vehicles have"} no
            listed body style.
          </p>
        ) : null}
      </Group>

      <Group
        title="Price"
        active={
          (filters.priceMin != null ? 1 : 0) +
          (filters.priceMax != null ? 1 : 0)
        }
        defaultOpen
      >
        <div className="flex gap-3">
          <RangeSelect
            id={`${idPrefix}-price-min`}
            label="Minimum"
            value={filters.priceMin}
            anyLabel="No min"
            options={PRICE_STEPS.map((v) => ({ value: v, label: money(v) }))}
            format={money}
            onChange={(v) => set({ priceMin: v })}
          />
          <RangeSelect
            id={`${idPrefix}-price-max`}
            label="Under"
            value={filters.priceMax}
            anyLabel="No max"
            options={PRICE_STEPS.map((v) => ({ value: v, label: money(v) }))}
            format={money}
            onChange={(v) => set({ priceMax: v })}
          />
        </div>
        <p className="mt-2 text-xs text-slate">
          Sale price, including doc and smog fees.
        </p>
      </Group>

      <Group
        title="Year"
        active={
          (filters.yearMin != null ? 1 : 0) + (filters.yearMax != null ? 1 : 0)
        }
      >
        <div className="flex gap-3">
          <RangeSelect
            id={`${idPrefix}-year-min`}
            label="From"
            value={filters.yearMin}
            anyLabel="Any"
            options={[...years].reverse()}
            onChange={(v) => set({ yearMin: v })}
          />
          <RangeSelect
            id={`${idPrefix}-year-max`}
            label="To"
            value={filters.yearMax}
            anyLabel="Any"
            options={years}
            onChange={(v) => set({ yearMax: v })}
          />
        </div>
      </Group>

      <Group title="Mileage" active={filters.mileageMax != null ? 1 : 0}>
        <RangeSelect
          id={`${idPrefix}-mileage`}
          label="Up to"
          value={filters.mileageMax}
          anyLabel="Any mileage"
          options={MILEAGE_STEPS.map((v) => ({
            value: v,
            label: `${v.toLocaleString("en-US")} miles`,
          }))}
          format={(v) => `${v.toLocaleString("en-US")} miles`}
          onChange={(v) => set({ mileageMax: v })}
        />
      </Group>

      <Group title="Fuel" active={count("fuel")}>
        <CheckList
          name="Fuel"
          options={withSelected(facets.fuel, filters.fuel)}
          selected={filters.fuel}
          onToggle={toggle("fuel")}
        />
        {facets.unknown.fuel > 0 && !filters.fuel?.length ? (
          <p className="mt-2 px-1 text-xs text-slate">
            {facets.unknown.fuel}{" "}
            {facets.unknown.fuel === 1 ? "vehicle has" : "vehicles have"} no
            listed fuel type.
          </p>
        ) : null}
      </Group>

      <Group title="Drivetrain" active={count("drivetrain")}>
        <CheckList
          name="Drivetrain"
          options={withSelected(facets.drivetrain, filters.drivetrain)}
          selected={filters.drivetrain}
          onToggle={toggle("drivetrain")}
        />
      </Group>

      <Group title="Transmission" active={count("transmission")}>
        <CheckList
          name="Transmission"
          options={withSelected(facets.transmission, filters.transmission)}
          selected={filters.transmission}
          onToggle={toggle("transmission")}
        />
      </Group>

      <Group title="Highway MPG" active={filters.hwyMpgMin != null ? 1 : 0}>
        <RangeSelect
          id={`${idPrefix}-mpg`}
          label="At least"
          value={filters.hwyMpgMin}
          anyLabel="Any"
          options={MPG_STEPS.map((v) => ({ value: v, label: `${v} MPG` }))}
          format={(v) => `${v} MPG`}
          onChange={(v) => set({ hwyMpgMin: v })}
        />
      </Group>

      <Group title="Exterior color" active={count("exteriorColor")}>
        <CheckList
          name="Exterior color"
          options={withSelected(facets.exteriorColor, filters.exteriorColor)}
          selected={filters.exteriorColor}
          onToggle={toggle("exteriorColor")}
          initialVisible={6}
        />
      </Group>

      <Group title="Interior color" active={count("interiorColor")}>
        <CheckList
          name="Interior color"
          options={withSelected(facets.interiorColor, filters.interiorColor)}
          selected={filters.interiorColor}
          onToggle={toggle("interiorColor")}
          initialVisible={6}
        />
      </Group>
    </div>
  );
}
