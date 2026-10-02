import { describe, expect, it } from "vitest";
import { can, PermissionError, STAFF_ROLES, type Action } from "@/lib/auth/permissions";
import { salePriceCents } from "@/lib/inventory/pricing";
import {
  createVehicle,
  resolvePublicVehicle,
  searchPublicInventory,
  updateVehicle,
  ValidationError,
} from "@/lib/services/inventory-service";
import {
  addLeadNote,
  getLeadFor,
  listLeadsFor,
  resetDemoData,
  submitDemoLead,
  updateLead,
} from "@/lib/services/lead-service";
import { manager, owner, sales1, sales2, tempStore } from "./support/fixtures";

const newVehicle = {
  vin: "1HGCV1F30LA012345",
  stockNumber: "DEMO-1",
  year: 2020,
  make: "Honda",
  model: "Accord",
  trim: "Sport",
  mileage: 42000,
  bodyType: "sedan",
  pricing: { internetPriceCents: 1_400_000, docFeeCents: 8_500, smogFeeCents: 5_000, otherFees: [] },
};

const contact = {
  firstName: "Test",
  lastName: "Shopper",
  email: "TEST@example.com",
  phone: "(909) 555-0100",
};

describe("permission matrix", () => {
  const expectations: Record<Action, Record<(typeof STAFF_ROLES)[number], boolean>> = {
    "inventory:view": { owner: true, manager: true, sales: true },
    "inventory:create": { owner: true, manager: true, sales: false },
    "inventory:edit": { owner: true, manager: true, sales: false },
    "inventory:edit-pricing": { owner: true, manager: true, sales: false },
    "inventory:set-status": { owner: true, manager: true, sales: false },
    "inventory:publish": { owner: true, manager: true, sales: false },
    "inventory:archive": { owner: true, manager: true, sales: false },
    "inventory:feature": { owner: true, manager: true, sales: false },
    "inventory:manage-photos": { owner: true, manager: true, sales: false },
    "leads:view-all": { owner: true, manager: true, sales: false },
    "leads:view-assigned": { owner: true, manager: true, sales: true },
    "leads:assign": { owner: true, manager: true, sales: false },
    "leads:update-status": { owner: true, manager: true, sales: true },
    "leads:add-note": { owner: true, manager: true, sales: true },
    "demo:reset": { owner: true, manager: false, sales: false },
  };
  for (const [action, byRole] of Object.entries(expectations)) {
    it(action, () => {
      for (const role of STAFF_ROLES) expect(can({ id: "x", role }, action as Action)).toBe(byRole[role]);
      expect(can(null, action as Action)).toBe(false);
    });
  }
});

describe("inventory management", () => {
  it("creates a draft that is hidden until published, then appears in search immediately", async () => {
    const { store } = tempStore();
    const created = await createVehicle(store, manager, newVehicle);
    expect(created).toMatchObject({ publication: "draft", title: "2020 Honda Accord Sport", slug: "2020-Honda-Accord" });
    expect((await searchPublicInventory(store, { q: "DEMO-1" })).total).toBe(0);
    expect((await resolvePublicVehicle(store, created.slug, created.id)).route.kind).toBe("not-found");

    await updateVehicle(store, manager, created.id, { publication: "published" });
    const hondas = await searchPublicInventory(store, { make: ["Honda"], priceMax: 15000 });
    expect(hondas.vehicles.map((v) => v.id)).toContain(created.id);
    expect((await resolvePublicVehicle(store, created.slug, created.id)).route.kind).toBe("ok");
  });

  it("rejects duplicate VINs and stock numbers, and invalid VINs", async () => {
    const { store } = tempStore();
    const xt5 = (await store.getVehicleByRouteId("1449827"))!;
    const err = await createVehicle(store, owner, { ...newVehicle, vin: xt5.vin.toLowerCase(), stockNumber: xt5.stockNumber })
      .then(() => null)
      .catch((e) => e);
    expect(err).toBeInstanceOf(ValidationError);
    expect(Object.keys(err.fieldErrors).sort()).toEqual(["stockNumber", "vin"]);
    await expect(createVehicle(store, owner, { ...newVehicle, vin: "1HGCV1F30LA01234O" })).rejects.toBeInstanceOf(
      ValidationError,
    );
    await expect(createVehicle(store, owner, { ...newVehicle, sneaky: true })).rejects.toBeInstanceOf(ValidationError);
  });

  it("pricing edits flow to the sale price used by search", async () => {
    const { store } = tempStore();
    const accord = (await store.getVehicleByRouteId("1581060"))!; // sale $10,134
    expect((await searchPublicInventory(store, { make: ["Honda"], priceMax: 15000 })).total).toBe(1);
    const updated = await updateVehicle(store, manager, accord.id, { pricing: { internetPriceCents: 1_490_000 } });
    expect(salePriceCents(updated.pricing)).toBe(1_503_500);
    expect(updated.staffEditedAt).not.toBeNull();
    expect((await searchPublicInventory(store, { make: ["Honda"], priceMax: 15000 })).total).toBe(0);
  });

  it("sold and archived vehicles leave shopping results and show the unavailable state", async () => {
    const { store } = tempStore();
    const rdx = (await store.getVehicleByRouteId("1567362"))!;
    await updateVehicle(store, manager, rdx.id, { status: "sold" });
    expect((await searchPublicInventory(store, { make: ["Acura"] })).total).toBe(1);
    expect((await resolvePublicVehicle(store, rdx.slug, "1567362")).route.kind).toBe("unavailable");
    await updateVehicle(store, owner, rdx.id, { status: "available", publication: "archived" });
    expect((await searchPublicInventory(store, { make: ["Acura"] })).total).toBe(1);
  });

  it("keeps imported slugs stable when editing title fields", async () => {
    const { store } = tempStore();
    const rdx = (await store.getVehicleByRouteId("1567362"))!;
    const updated = await updateVehicle(store, manager, rdx.id, { trim: "Technology" });
    expect(updated.title).toBe("2019 Acura RDX Technology");
    expect(updated.slug).toBe("2019-Acura-RDX");
  });

  it("sales and anonymous actors cannot change inventory", async () => {
    const { store } = tempStore();
    const rdx = (await store.getVehicleByRouteId("1567362"))!;
    await expect(createVehicle(store, sales1, newVehicle)).rejects.toBeInstanceOf(PermissionError);
    await expect(updateVehicle(store, sales1, rdx.id, { featured: true })).rejects.toBeInstanceOf(PermissionError);
    await expect(updateVehicle(store, null, rdx.id, { mileage: 1 })).rejects.toBeInstanceOf(PermissionError);
    expect((await store.getVehicle(rdx.id))!.featured).toBe(false);
  });

  it("featuring sets rank; un-featuring clears it", async () => {
    const { store } = tempStore();
    const rdx = (await store.getVehicleByRouteId("1567362"))!;
    await updateVehicle(store, manager, rdx.id, { featured: true, featuredRank: 1 });
    expect((await searchPublicInventory(store, {})).vehicles[0].id).toBe(rdx.id);
    const off = await updateVehicle(store, manager, rdx.id, { featured: false });
    expect(off.featuredRank).toBeNull();
  });

  it("detects concurrent edits", async () => {
    const { store } = tempStore();
    const rdx = (await store.getVehicleByRouteId("1567362"))!;
    await updateVehicle(store, manager, rdx.id, { mileage: 50_000 }, rdx.updatedAt);
    await expect(updateVehicle(store, owner, rdx.id, { mileage: 60_000 }, rdx.updatedAt)).rejects.toThrow(/changed/);
  });
});

describe("demo leads", () => {
  it("stores a validated public submission for the inbox, unassigned", async () => {
    const { store } = tempStore();
    const lead = await submitDemoLead(store, {
      type: "vehicle-inquiry",
      subtype: "question",
      ...contact,
      sourcePath: "/pre-owned-cars/detail/2019-Acura-RDX/1567362",
      vehicleId: "1567362",
      message: "Is it still available?",
    });
    expect(lead).toMatchObject({
      status: "new",
      assignedTo: null,
      isSynthetic: false,
      email: "test@example.com",
      phone: "9095550100",
      vehicleId: "veh_1567362",
      vehicleTitle: "2019 Acura RDX w/Technology Pkg",
    });
    expect((await listLeadsFor(store, manager)).map((l) => l.id)).toContain(lead.id);
  });

  it("validates each form type server-side", async () => {
    const { store } = tempStore();
    const base = { ...contact, sourcePath: "/sell-my-car" };
    await expect(submitDemoLead(store, { type: "contact", ...base, department: "sales", message: "" })).rejects.toBeInstanceOf(ValidationError);
    await expect(submitDemoLead(store, { type: "contact", ...base, phone: "123", department: "sales", message: "Hi" })).rejects.toBeInstanceOf(ValidationError);
    await expect(
      submitDemoLead(store, {
        type: "trade-appraisal",
        ...base,
        details: { lookup: { method: "vin", vin: "SHORT" }, mileage: 1, condition: "good", zip: "92316", photoCount: 0 },
      }),
    ).rejects.toBeInstanceOf(ValidationError);
    const ok = await submitDemoLead(store, {
      type: "trade-appraisal",
      ...base,
      details: { lookup: { method: "plate", plate: "8abc123", state: "ca" }, mileage: 90000, condition: "very-good", zip: "92316", photoCount: 2 },
    });
    expect(ok.details).toMatchObject({ lookup: { plate: "8ABC123", state: "CA" } });
    await expect(
      submitDemoLead(store, { type: "find-my-car", ...base, details: { priceMax: 20000 } }),
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(submitDemoLead(store, { type: "contact", ...base, department: "sales", message: "Hi", ssn: "x" })).rejects.toBeInstanceOf(ValidationError);
  });

  it("refuses inquiries about unavailable vehicles", async () => {
    const { store } = tempStore();
    const rdx = (await store.getVehicleByRouteId("1567362"))!;
    await updateVehicle(store, owner, rdx.id, { status: "sold" });
    await expect(
      submitDemoLead(store, { type: "test-drive", ...contact, sourcePath: "/x", vehicleId: "1567362" }),
    ).rejects.toThrow(/no longer available/);
  });

  it("sales staff only see and act on leads assigned to them", async () => {
    const { store } = tempStore();
    const mine = await listLeadsFor(store, sales1);
    expect(mine.map((l) => l.id)).toEqual(["lead_sample_02"]);
    await expect(getLeadFor(store, sales1, "lead_sample_04")).rejects.toBeInstanceOf(PermissionError);
    await expect(updateLead(store, sales1, "lead_sample_04", { status: "closed" })).rejects.toBeInstanceOf(PermissionError);

    const updated = await updateLead(store, sales1, "lead_sample_02", { status: "scheduled" });
    expect(updated.status).toBe("scheduled");
    await expect(updateLead(store, sales1, "lead_sample_02", { assignedTo: "demo-sales-2" })).rejects.toBeInstanceOf(PermissionError);
    const noted = await addLeadNote(store, sales1, "lead_sample_02", { body: "Called back." });
    expect(noted.notes.at(-1)).toMatchObject({ authorId: "demo-sales-1", body: "Called back." });

    expect((await listLeadsFor(store, manager)).length).toBe(5);
    await updateLead(store, manager, "lead_sample_01", { assignedTo: "demo-sales-2" });
    expect((await listLeadsFor(store, sales2)).map((l) => l.id).sort()).toEqual(["lead_sample_01", "lead_sample_04"]);
    await expect(updateLead(store, manager, "lead_sample_01", { assignedTo: "nobody" })).rejects.toBeInstanceOf(ValidationError);
    await expect(listLeadsFor(store, null)).rejects.toBeInstanceOf(PermissionError);
  });

  it("filters the inbox by status, type and text", async () => {
    const { store } = tempStore();
    expect((await listLeadsFor(store, owner, { status: "new" })).map((l) => l.id).sort()).toEqual([
      "lead_sample_01",
      "lead_sample_03",
    ]);
    expect((await listLeadsFor(store, owner, { type: "find-my-car" })).length).toBe(1);
    expect((await listLeadsFor(store, owner, { q: "sierra" })).map((l) => l.id)).toEqual(["lead_sample_02"]);
  });

  it("only the owner can reset demo data", async () => {
    const { store } = tempStore();
    await submitDemoLead(store, { type: "contact", ...contact, sourcePath: "/contact-us", department: "sales", message: "Hi" });
    await expect(resetDemoData(store, manager)).rejects.toBeInstanceOf(PermissionError);
    expect((await store.listLeads()).length).toBe(6);
    await resetDemoData(store, owner);
    expect((await store.listLeads()).length).toBe(5);
  });
});
