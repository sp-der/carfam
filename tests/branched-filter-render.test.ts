import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FilterPanel } from "../src/components/inventory/filter-panel";
import { searchInventory } from "../src/lib/inventory/search";
import { seedVehicles } from "./support/fixtures";
import type { InventoryFilters } from "../src/lib/inventory/filters";

function render(filters: InventoryFilters) {
  const { facets } = searchInventory(seedVehicles, filters);
  return renderToStaticMarkup(
    createElement(FilterPanel, {
      idPrefix: "test",
      filters,
      facets,
      onChange: () => {},
    }),
  );
}

describe("branched filter server markup", () => {
  it("retains native multi-select checkboxes and independent selected branches", () => {
    const html = render({ make: ["Honda", "Toyota"] });
    expect(html).toContain('class="branched-filters"');
    expect(html).toMatch(
      /<input(?=[^>]*checked="")(?=[^>]*value="Honda")[^>]*>/,
    );
    expect(html).toMatch(
      /<input(?=[^>]*checked="")(?=[^>]*value="Toyota")[^>]*>/,
    );
    expect(html.match(/stroke-dashoffset:0/g)?.length).toBe(2);
  });
  it("retains unmatched selections so they can be removed", () => {
    const html = render({ make: ["Unlisted make"] });
    expect(html).toMatch(
      /<input(?=[^>]*checked="")(?=[^>]*value="Unlisted make")[^>]*>/,
    );
    expect(html).not.toMatch(/disabled=""[^>]*value="Unlisted make"/);
  });
  it("shows arbitrary URL/chat budgets without changing strict budget semantics", () => {
    const html = render({ priceMax: 17321 });
    expect(html).toContain(
      '<option value="17321" selected="">$17,321</option>',
    );
    expect(html).toContain("Under");
    expect(html).toContain("Sale price, including doc and smog fees.");
  });
  it("exposes expanded controls and makes folded controls inert", () => {
    const html = render({ fuel: ["electric"] });
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain("aria-controls=");
    expect(html).toContain('inert="" aria-hidden="true"');
    expect(html).toMatch(
      /<input(?=[^>]*checked="")(?=[^>]*value="electric")[^>]*>/,
    );
  });
});
