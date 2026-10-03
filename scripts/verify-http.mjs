import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";

const base = process.env.CARFAM_VERIFY_URL ?? "http://127.0.0.1:3000";
let server;
if (process.env.CARFAM_START_SERVER === "1") {
  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1"], { env: { ...process.env, CARFAM_DATA_FILE: `.data/http-${Date.now()}.json`, NEXT_TELEMETRY_DISABLED: "1" }, stdio: ["ignore", "pipe", "pipe"] });
  process.on("exit", () => server?.kill());
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Local test server did not become ready.")), 20_000);
    server.stdout.on("data", (chunk) => { process.stdout.write(chunk); if (chunk.toString().includes("Ready")) { clearTimeout(timer); resolve(); } });
    server.stderr.on("data", (chunk) => process.stderr.write(chunk));
    server.on("exit", (code) => { clearTimeout(timer); reject(new Error(`Local test server exited ${code}`)); });
  });
}
let checks = 0;
const ok = (label) => { checks++; console.log(`PASS ${label}`); };
async function call(path, body, actor) {
  const r = await fetch(`${base}${path}`, body ? { method: "POST", headers: { "Content-Type": "application/json", Origin: base }, body: JSON.stringify(body) } : undefined);
  const value = await r.json();
  if (actor) assert.equal(r.status, actor);
  else assert.ok(r.ok, `${path}: ${r.status} ${JSON.stringify(value)}`);
  return { response: r, value };
}
const routes = ["/", "/pre-owned-cars", "/contact-us", "/find-my-car", "/sell-my-car", "/finance-your-car", "/finance-your-car/pre-approved", "/solicitar-financiacion", "/capital-one-pre-qualify-then-shop", "/bad-credit-financing-in-bloomington-ca", "/about-us", "/meet-our-team", "/customer-gallery-at-carfam", "/used-car-dealer-serving-the-community-in-rialto", "/careers", "/resources", "/news", "/ada-policy-statement", "/privacy-policy", "/privacy-rights", "/account/login", "/account/forgot-password", "/visual-sitemap", "/best-used-cars-in-bloomington-ca", "/best-used-coupes-in-bloomington-ca", "/best-used-suvs-in-rialto-ca", "/best-used-trucks-in-rialto-ca", "/buying-a-car-in-bloomington-ca", "/used-car-rialto-used-car-dealership-guide", "/used-ev-home-charging-guide-rialto-ca", "/admin", "/admin/inventory", "/admin/leads"];
for (const route of routes) {
  const r = await fetch(base + route); const html = await r.text();
  assert.equal(r.status, 200, route); assert.ok(html.includes("<h1") || route.startsWith("/admin"), route);
  assert.ok(r.headers.get("x-robots-tag")?.includes("noindex")); ok(`route ${route}`);
}
assert.equal((await fetch(base + "/not-a-real-page")).status, 404); ok("unknown route 404");
const actor = "demo-manager";
const { value: admin } = await call(`/api/admin?actor=${actor}`);
assert.equal(admin.vehicles.length, 127); ok("admin reads 127 seeded vehicles");
await call("/api/admin?actor=unknown", null, 403); ok("unknown actor denied");
await call("/api/admin", { actor: "demo-sales-1", action: "create-vehicle", input: {} }, 403); ok("sales inventory mutation denied");
const input = { message: "Show me Hondas under $15k", filters: {}, lastResultIds: [] };
const { value: chat } = await call("/api/chat", input);
assert.equal(chat.total, 1); assert.equal(chat.cards[0].salePriceCents, 1013400); ok("Honda strict sale-price chatbot search");
const { value: lexus } = await call("/api/chat", { ...input, message: "Show me Lexuses" }); assert.equal(lexus.total, 8); ok("Lexus chatbot search");
const { value: suv } = await call("/api/chat", { ...input, message: "Only SUVs", filters: lexus.filters }); assert.equal(suv.total, 3); assert.deepEqual(suv.filters.make, ["Lexus"]); ok("follow-up filters preserve make");
const { value: empty } = await call("/api/chat", { ...input, message: "Only SUVs", filters: chat.filters }); assert.equal(empty.total, 0); assert.equal(empty.filters.priceMax, 15000); ok("no-results does not relax budget");
await call("/api/chat", { ...input, message: "x".repeat(601) }, 422); ok("chat input length enforced");
const { value: sensitive } = await call("/api/chat", { ...input, message: "my ssn is 123-45-6789" }); assert.match(sensitive.message, /do not share/); ok("sensitive data rejected from model path");
const stamp = Date.now().toString().slice(-6);
const vin = `1HGCV1F30LA${stamp}`;
const { value: created } = await call("/api/admin", { actor, action: "create-vehicle", input: { vin, stockNumber: `HTTP-${stamp}`, year: 2020, make: "Honda", model: "Verification", mileage: 12345, pricing: { internetPriceCents: 1000000, docFeeCents: 8500, smogFeeCents: 5000, otherFees: [] } } });
assert.equal(created.vehicle.publication, "draft"); ok("create persists draft vehicle");
const { value: saved } = await call("/api/admin", { actor, action: "update-vehicle", entityId: created.vehicle.id, updatedAt: created.vehicle.updatedAt, input: { publication: "published", status: "pending" } });
assert.equal(saved.vehicle.status, "pending"); ok("publish and status edits persist");
const { value: updatedChat } = await call("/api/chat", input); assert.equal(updatedChat.total, 2); ok("chat reads newly published admin vehicle");
const data = new FormData(); data.set("actor", actor); data.set("vehicleId", saved.vehicle.id); data.set("updatedAt", saved.vehicle.updatedAt); data.set("photo", new Blob([await readFile("public/vehicles/1573124/1.jpg")], { type: "image/jpeg" }), "sample.jpg");
const upload = await fetch(`${base}/api/admin/photos`, { method: "POST", headers: { Origin: base }, body: data }); const photo = await upload.json(); assert.equal(upload.status, 200, JSON.stringify(photo));
for (const suffix of [".jpg", "-480.webp", "-960.webp"]) assert.equal((await fetch(base + photo.vehicle.images[0].src.replace(/\.jpg$/, suffix))).status, 200);
ok("photo upload generates and serves all variants");
await call("/api/admin", { actor, action: "update-vehicle", entityId: created.vehicle.id, input: { publication: "archived" } });
const { value: archivedChat } = await call("/api/chat", input); assert.equal(archivedChat.total, 1); ok("archived vehicle excluded from chat");
const { value: lead } = await call("/api/leads", { type: "contact", firstName: "HTTP", lastName: "Sample", email: "http@example.com", phone: "5555550199", sourcePath: "/contact-us", department: "sales", message: "Synthetic HTTP verification request." }); assert.equal(lead.notice, "Demo only—nothing was sent."); ok("public demo contact stores request");
const { value: inbox } = await call(`/api/admin?actor=${actor}`); const request = inbox.leads.find((l) => l.id === lead.reference); assert.ok(request); ok("request appears in manager inbox");
await call("/api/admin", { actor, action: "update-lead", entityId: request.id, input: { assignedTo: "demo-sales-1", status: "contacted" } });
const { value: sales } = await call("/api/admin?actor=demo-sales-1"); assert.ok(sales.leads.find((l) => l.id === request.id)); ok("assigned sales actor can read lead");
const { value: otherSales } = await call("/api/admin?actor=demo-sales-2"); assert.ok(!otherSales.leads.find((l) => l.id === request.id)); ok("other sales actor cannot read lead");
await call("/api/admin", { actor: "demo-sales-1", action: "add-note", entityId: request.id, input: { body: "Synthetic follow-up note." } }); ok("assigned sales actor can add note");
await call("/api/admin", { actor: "demo-sales-2", action: "add-note", entityId: request.id, input: { body: "Should be denied." } }, 403); ok("unassigned sales note denied");
console.log(`HTTP verification complete: ${checks} checks passed. Sample lead and archived test vehicle retained locally.`);
server?.kill();
