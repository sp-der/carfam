import { describe, expect, it } from "vitest";
import {
  chatInputSchema,
  chatToolSchema,
  containsSensitiveData,
  executeChatTool,
  parseDemoIntent,
  type ChatInput,
} from "@/lib/chat/assistant";
import { demoActor } from "@/lib/auth/demo-actor";
import { updateVehicle } from "@/lib/services/inventory-service";
import { manager, seedVehicles, tempStore } from "./support/fixtures";

const makes = [...new Set(seedVehicles.map((v) => v.make))];
const request = (
  message: string,
  filters: ChatInput["filters"] = {},
  lastResultIds: string[] = [],
): ChatInput => ({ message, filters, lastResultIds });
async function ask(
  message: string,
  filters: ChatInput["filters"] = {},
  lastResultIds: string[] = [],
) {
  const { store } = tempStore();
  const input = request(message, filters, lastResultIds);
  return executeChatTool(store, input, parseDemoIntent(input, makes));
}

describe("inventory assistant", () => {
  it("Hondas under $15k uses sale price and real inventory", async () => {
    const reply = await ask("Show me Hondas under $15k");
    expect(reply.filters).toEqual({ make: ["Honda"], priceMax: 15000 });
    expect(reply.total).toBe(1);
    expect(reply.cards[0].title).toBe("2013 Honda Accord Sedan LX");
    expect(reply.cards[0].salePriceCents).toBe(1_013_400);
    expect(reply.href).toContain("priceMax=15000");
    expect(reply.message).toContain("not live availability");
  });
  it("Lexus plurals and possessives match the canonical make", async () => {
    for (const message of [
      "Show me Lexuses",
      "Show me Lexus's",
      "Show me Lexus’s",
    ]) {
      const reply = await ask(message);
      expect(reply.filters.make).toEqual(["Lexus"]);
      expect(reply.total).toBe(8);
    }
  });
  it("only SUVs preserves the make and budget", async () => {
    const reply = await ask("Only SUVs", { make: ["Lexus"], priceMax: 20000 });
    expect(reply.filters).toEqual({
      make: ["Lexus"],
      priceMax: 20000,
      body: ["suv"],
    });
  });
  it("actually replaces the price limit", async () => {
    const reply = await ask("Actually under $20k", {
      make: ["Honda"],
      priceMax: 15000,
    });
    expect(reply.filters).toEqual({ make: ["Honda"], priceMax: 20000 });
  });
  it("a new show-me search replaces old criteria", async () => {
    expect(
      (await ask("Show me Lexuses", { make: ["Honda"], priceMax: 15000 }))
        .filters,
    ).toEqual({ make: ["Lexus"] });
  });
  it("clear resets filters", async () => {
    expect(
      (await ask("Clear everything", { make: ["Honda"], priceMax: 15000 }))
        .filters,
    ).toEqual({});
  });
  it("empty matches do not relax the budget", async () => {
    const reply = await ask("Only SUVs", { make: ["Honda"], priceMax: 15000 });
    expect(reply.total).toBe(0);
    expect(reply.filters.priceMax).toBe(15000);
    expect(reply.message).toContain("not relaxed");
  });
  it("opens an unambiguous public vehicle", async () => {
    const reply = await ask("Show me that one", {}, ["veh_1573124"]);
    expect(reply.href).toBe("/pre-owned-cars/detail/2021-Toyota-RAV4/1573124");
    expect(reply.navigate).toBe(true);
  });
  it("clarifies ambiguous references", () => {
    expect(
      parseDemoIntent(request("Show me that one", {}, ["a", "b"]), makes),
    ).toContain("Which vehicle");
  });
  it("does not silently ignore unsupported constraints", () => {
    expect(
      parseDemoIntent(request("Show me Hondas under $15k with AWD"), makes),
    ).toBeNull();
    expect(parseDemoIntent(request("2021 Toyotas"), makes)).toBeNull();
  });
  it("unknown messages do not pretend to be AI", () => {
    expect(
      parseDemoIntent(
        request("find something that suits my personality"),
        makes,
      ),
    ).toBeNull();
  });
  it("reads current edits; sold and archived vehicles are excluded", async () => {
    const { store } = tempStore();
    const accord = (await store.getVehicleByRouteId("1581060"))!;
    await updateVehicle(store, manager, accord.id, { status: "sold" });
    const input = request("Show me Hondas under $15k");
    expect(
      (await executeChatTool(store, input, parseDemoIntent(input, makes)))
        .total,
    ).toBe(0);
    expect(
      (
        await executeChatTool(store, input, {
          name: "open_vehicle",
          input: { vehicleId: accord.id },
        })
      ).href,
    ).toBeUndefined();
  });
  it("photo preference is retained in the search result cards", async () => {
    const reply = await ask("Show me Lexuses");
    expect(reply.cards[0].image).not.toBeNull();
  });
  it("does not repeat unapproved FAQs or promise financing", async () => {
    expect((await ask("What are your hours?")).message).toContain(
      "pending approval",
    );
    expect((await ask("Will you approve my financing?")).message).toContain(
      "cannot guarantee approval",
    );
  });
  it("contact and test-drive tools only navigate locally", async () => {
    const reply = await ask("I want to talk to staff");
    expect(reply.href).toBe("/contact-us");
    expect((await ask("Can I book a test drive?")).message).toContain(
      "does not confirm",
    );
  });
  it("rejects arbitrary tools, URLs and invalid filters", () => {
    expect(
      chatToolSchema.safeParse({ name: "run_sql", input: "DELETE" }).success,
    ).toBe(false);
    expect(
      chatToolSchema.safeParse({
        name: "open_vehicle",
        input: { vehicleId: "1", url: "https://evil.example" },
      }).success,
    ).toBe(false);
    expect(
      chatToolSchema.safeParse({
        name: "apply_inventory_filters",
        input: { mode: "replace", set: { priceMax: -1 } },
      }).success,
    ).toBe(false);
    expect(chatInputSchema.safeParse(request("x".repeat(601))).success).toBe(
      false,
    );
  });
  it("blocks common contact and sensitive financial patterns", () => {
    for (const text of [
      "my ssn is 123-45-6789",
      "bank account 123456789",
      "my income is 90000",
      "me@example.com",
      "909-555-0100",
    ])
      expect(containsSensitiveData(text)).toBe(true);
    expect(containsSensitiveData("Hondas under $15k")).toBe(false);
  });
  it("validates demo actors against seeded staff", async () => {
    const { store } = tempStore();
    expect(await demoActor(store, "demo-sales-1")).toEqual({
      id: "demo-sales-1",
      role: "sales",
    });
    await expect(demoActor(store, "unknown-owner")).rejects.toThrow();
  });
});
