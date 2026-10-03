import { z } from "zod";
import type { Repository } from "@/lib/data/repository";
import {
  applyFilterPatch,
  describeFilters,
  filterPatchSchema,
  inventoryFiltersSchema,
  inventoryHref,
  type FilterPatch,
  type InventoryFilters,
} from "@/lib/inventory/filters";
import { toVehicleCard, type VehicleCard } from "@/lib/inventory/public";
import { preferPhotographed, isShoppable } from "@/lib/inventory/search";
import { vehicleDetailPath } from "@/lib/inventory/types";
import {
  searchPublicInventory,
  suggestPublicRelaxations,
} from "@/lib/services/inventory-service";
import faqs from "../../../data/seed/faqs.seed.json";

export const chatInputSchema = z
  .object({
    message: z.string().trim().min(1).max(600),
    filters: inventoryFiltersSchema.default({}),
    lastResultIds: z.array(z.string().max(100)).max(8).default([]),
  })
  .strict();
export type ChatInput = z.infer<typeof chatInputSchema>;
export const chatToolSchema = z.discriminatedUnion("name", [
  z
    .object({
      name: z.literal("apply_inventory_filters"),
      input: filterPatchSchema,
    })
    .strict(),
  z
    .object({
      name: z.literal("open_vehicle"),
      input: z.object({ vehicleId: z.string().min(1).max(100) }).strict(),
    })
    .strict(),
  z
    .object({
      name: z.literal("get_dealership_faq"),
      input: z
        .object({
          topic: z.enum(["hours", "location", "contact", "financing"]),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      name: z.literal("open_contact_form"),
      input: z.object({ kind: z.enum(["contact", "test-drive"]) }).strict(),
    })
    .strict(),
]);
export type ChatTool = z.infer<typeof chatToolSchema>;
export interface ChatReply {
  message: string;
  filters: InventoryFilters;
  lastResultIds: string[];
  cards: VehicleCard[];
  href?: string;
  navigate?: boolean;
  mode: "demo" | "ai";
  total?: number;
}

/** Keep sensitive financial/identity data out of any model request. Not a production DLP system. */
export function containsSensitiveData(message: string) {
  return /\b(ssn|social security|bank account|routing number|date of birth|my income|credit card)\b|\b\d{3}[- ]\d{2}[- ]\d{4}\b|\b\d{9,}\b|[\w.+-]+@[\w.-]+\.[a-z]{2,}|\b\d{3}[- .]\d{3}[- .]\d{4}\b/i.test(
    message,
  );
}
export function parseDemoIntent(
  input: ChatInput,
  makes: string[],
): ChatTool | string | null {
  const text = input.message.toLowerCase().replaceAll("’", "'");
  if (/\b(clear|reset|start over)\b/.test(text))
    return { name: "apply_inventory_filters", input: { mode: "clear" } };
  if (
    /\b(approve|approval|apr|credit check|financing|finance|loan)\b/.test(text)
  )
    return { name: "get_dealership_faq", input: { topic: "financing" } };
  if (/\b(hours|open today|closing|close today)\b/.test(text))
    return { name: "get_dealership_faq", input: { topic: "hours" } };
  if (/\b(where|address|location)\b/.test(text))
    return { name: "get_dealership_faq", input: { topic: "location" } };
  if (/\b(contact|human|salesperson|staff|test drive|test-drive)\b/.test(text))
    return {
      name: "open_contact_form",
      input: { kind: /test.?drive/.test(text) ? "test-drive" : "contact" },
    };
  if (/\b(that one|open it|view it)\b/.test(text))
    return input.lastResultIds.length === 1
      ? { name: "open_vehicle", input: { vehicleId: input.lastResultIds[0] } }
      : "Which vehicle do you mean? Choose a vehicle card below.";
  const ordinal = text.match(/\b(first|second|third|fourth|fifth|sixth)\b/);
  if (ordinal && /\b(show|open|view)\b/.test(text)) {
    const i = ["first", "second", "third", "fourth", "fifth", "sixth"].indexOf(
      ordinal[1],
    );
    return input.lastResultIds[i]
      ? { name: "open_vehicle", input: { vehicleId: input.lastResultIds[i] } }
      : "That result is not available. Choose a vehicle card.";
  }
  const makeMatches = makes.filter((make) => {
    const escaped = make.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${escaped}(?:s|es|'s)?\\b`).test(text);
  });
  const body: InventoryFilters["body"] = /\bsuvs?\b/.test(text)
    ? ["suv"]
    : /\b(trucks?|pickups?)\b/.test(text)
      ? ["pickup"]
      : /\bsedans?\b/.test(text)
        ? ["sedan"]
        : /\bcoupes?\b/.test(text)
          ? ["coupe"]
          : /\bhatchbacks?\b/.test(text)
            ? ["hatchback"]
            : undefined;
  const budget = text.match(
    /\b(?:under|below|less than)\s*\$?\s*([\d,]+(?:\.\d+)?)\s*(k|grand)?\b/,
  );
  const priceMax = budget
    ? Math.round(Number(budget[1].replaceAll(",", "")) * (budget[2] ? 1000 : 1))
    : undefined;
  const fuel: InventoryFilters["fuel"] = /\b(evs?|electric)\b/.test(text)
    ? ["electric"]
    : /\bhybrids?\b/.test(text)
      ? ["hybrid", "plug-in-hybrid"]
      : undefined;
  const sort: InventoryFilters["sort"] = /\b(cheapest|lowest price)\b/.test(
    text,
  )
    ? "price-asc"
    : /\bnewest\b/.test(text)
      ? "year-desc"
      : undefined;
  if (!makeMatches.length && !body && priceMax === undefined && !fuel && !sort)
    return null;
  // Complex constraints should not be silently dropped by the deterministic fallback.
  if (
    /\b(awd|4wd|fwd|rwd|miles|mileage|between|over|from\s+20\d\d|20\d\d)\b/.test(
      text,
    )
  )
    return null;
  const set: InventoryFilters = {
    ...(makeMatches.length && { make: makeMatches }),
    ...(body && { body }),
    ...(priceMax !== undefined && { priceMax }),
    ...(fuel && { fuel }),
    ...(sort && { sort }),
  };
  const patch: FilterPatch = {
    mode: /^(only|also|actually|and|just)\b/.test(text) ? "merge" : "replace",
    set,
  };
  const parsed = filterPatchSchema.safeParse(patch);
  return parsed.success
    ? { name: "apply_inventory_filters", input: parsed.data }
    : "That budget or filter is outside the supported range. Please try another value.";
}

export async function executeChatTool(
  repo: Repository,
  input: ChatInput,
  raw: unknown,
  mode: "demo" | "ai" = "demo",
): Promise<ChatReply> {
  const tool = chatToolSchema.parse(raw);
  const base = {
    filters: input.filters,
    lastResultIds: input.lastResultIds,
    cards: [],
    mode,
  };
  if (tool.name === "get_dealership_faq") {
    if (tool.input.topic === "financing")
      return {
        ...base,
        message:
          "Financing providers are not connected in this demo. I cannot guarantee approval, quote lender rates or accept credit details. You can explore the financing preview.",
        href: "/finance-your-car",
      };
    const faq = faqs.find(
      (f) => f.topic === tool.input.topic && f.status === "published",
    );
    return {
      ...base,
      message:
        faq?.answer ??
        "The dealership FAQ for this topic is pending approval. Please review the contact page; I won't present an unapproved answer as confirmed.",
      href: "/contact-us",
    };
  }
  if (tool.name === "open_contact_form")
    return {
      ...base,
      message:
        tool.input.kind === "test-drive"
          ? "Use the contact form's test-drive department to make a demo request. It does not confirm an appointment."
          : "You can save a demo contact request. No message will be sent to staff.",
      href: "/contact-us",
      navigate: true,
    };
  if (tool.name === "open_vehicle") {
    const v =
      (await repo.getVehicle(tool.input.vehicleId)) ??
      (await repo.getVehicleByRouteId(tool.input.vehicleId));
    if (!v || !isShoppable(v))
      return {
        ...base,
        message: "That vehicle is unavailable. Try a new inventory search.",
      };
    return {
      ...base,
      message: `Opening ${v.title}.`,
      href: vehicleDetailPath(v),
      navigate: true,
    };
  }
  const filters = applyFilterPatch(input.filters, tool.input);
  const results = await searchPublicInventory(repo, filters);
  const cards = preferPhotographed(results.vehicles)
    .slice(0, 6)
    .map(toVehicleCard);
  const criteria =
    describeFilters(filters)
      .map((c) => c.label)
      .join(", ") || "all inventory";
  if (!results.total) {
    const relaxations = await suggestPublicRelaxations(repo, filters);
    return {
      ...base,
      filters,
      total: 0,
      lastResultIds: [],
      message: `No matches for ${criteria}. Your budget and filters were not relaxed.${relaxations.length ? " Try removing one filter on the inventory page to explore alternatives." : " Try a different make or body style."}`,
      href: inventoryHref(filters),
      navigate: true,
    };
  }
  return {
    ...base,
    filters,
    cards,
    total: results.total,
    lastResultIds: cards.map((c) => c.id),
    message: `${results.total} matching ${results.total === 1 ? "vehicle" : "vehicles"} for ${criteria}. Sale prices include listed doc/smog fees; tax, registration and other charges are excluded. This is demo snapshot inventory, not live availability.`,
    href: inventoryHref(filters),
    navigate: true,
  };
}
