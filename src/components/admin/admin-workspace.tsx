"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Vehicle } from "@/lib/inventory/types";
import {
  BODY_TYPES,
  FUEL_TYPES,
  DRIVETRAINS,
  TRANSMISSIONS,
  PUBLICATION_STATES,
  VEHICLE_STATUSES,
  vehicleDetailPath,
} from "@/lib/inventory/types";
import { salePriceCents, formatPrice } from "@/lib/inventory/pricing";
import type { Lead } from "@/lib/leads/types";
import { LEAD_STATUSES, LEAD_TYPE_LABELS } from "@/lib/leads/types";
import type { DemoStaffMember, RepositoryInfo } from "@/lib/data/repository";
import { can } from "@/lib/auth/permissions";
import { VehiclePhoto } from "@/components/vehicles/vehicle-photo";

type Workspace = {
  vehicles: Vehicle[];
  leads: Lead[];
  staff: DemoStaffMember[];
  info: RepositoryInfo;
};
export function AdminWorkspace({
  staff,
  initialSection,
  initialId,
}: {
  staff: DemoStaffMember[];
  initialSection: "inventory" | "leads";
  initialId: string | null;
}) {
  const [actorId, setActorId] = useState(staff[0]?.id ?? "");
  const [section, setSection] = useState(initialSection);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [selected, setSelected] = useState<string | null>(initialId);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const actor = staff.find((s) => s.id === actorId)!;
  const requestId = useRef(0);
  async function reload() {
    const response = await fetch(
      `/api/admin?actor=${encodeURIComponent(actorId)}`,
      { cache: "no-store" },
    );
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    setWorkspace(result);
  }
  useEffect(() => {
    const id = ++requestId.current;
    fetch(`/api/admin?actor=${encodeURIComponent(actorId)}`, {
      cache: "no-store",
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error);
        if (id === requestId.current) setWorkspace(data);
      })
      .catch((e) => setError(e.message));
  }, [actorId]);
  async function mutate(
    action: string,
    input?: unknown,
    entityId?: string,
    updatedAt?: string,
  ) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actor: actorId,
          action,
          input,
          entityId,
          updatedAt,
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          [
            result.error,
            ...Object.values(result.fieldErrors ?? {}).flat(),
          ].join(" "),
        );
      await reload();
      setNotice(result.notice ?? "Saved to the local demo store.");
      if (result.vehicle) setSelected(result.vehicle.id);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save.");
      return false;
    } finally {
      setBusy(false);
    }
  }
  const vehicle = workspace?.vehicles.find((v) => v.id === selected);
  const lead = workspace?.leads.find((l) => l.id === selected);
  const readOnly = workspace?.info.readOnly ?? true;
  const editable = can(actor, "inventory:edit") && !readOnly;
  return (
    <main id="main" className="min-h-dvh bg-mist">
      <header className="on-dark bg-graphite px-4 py-5 text-paper sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <Link href="/" className="font-display text-2xl">
            Carfam <span className="text-cyan">/ Admin</span>
          </Link>
          <label className="flex flex-wrap items-center gap-3 text-sm">
            Viewing as
            <select
              className="min-h-11 rounded-md bg-paper px-3 text-ink"
              value={actorId}
              onChange={(e) => {
                setActorId(e.target.value);
                setWorkspace(null);
                setSelected(null);
                setError("");
              }}
            >
              {staff.map((s) => (
                <option value={s.id} key={s.id}>
                  {s.name} · {s.role}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>
      <div className="bg-amber-bg px-4 py-3 text-center text-sm font-bold text-amber">
        Demo mode — no login. The role switcher is not security. Use sample data
        only; protect any hosted preview.
      </div>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
        {readOnly && workspace && (
          <p className="mb-5 rounded-lg border border-amber bg-amber-bg p-4 text-amber">
            Read-only preview: {workspace.info.readOnlyReason}. Editing and
            uploads are disabled.
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            ["Vehicles", workspace?.vehicles.length ?? "—"],
            [
              "New leads visible to this role",
              workspace?.leads.filter((l) => l.status === "new").length ?? "—",
            ],
            [
              "Featured vehicles",
              workspace?.vehicles.filter((v) => v.featured).length ?? "—",
            ],
          ].map(([title, count]) => (
            <div className="rounded-xl bg-paper p-5" key={title}>
              <p className="text-sm text-slate">{title}</p>
              <p className="font-display mt-2 text-3xl">{count}</p>
            </div>
          ))}
        </div>
        <nav className="mt-6 flex flex-wrap gap-3" aria-label="Admin sections">
          <button
            className={section === "inventory" ? "button" : "button-secondary"}
            onClick={() => {
              setSection("inventory");
              setSelected(null);
              setStatus("");
            }}
          >
            Inventory
          </button>
          <button
            className={section === "leads" ? "button" : "button-secondary"}
            onClick={() => {
              setSection("leads");
              setSelected(null);
              setStatus("");
            }}
          >
            Lead inbox
          </button>
          <Link className="button-secondary" href="/">
            View website
          </Link>
          {can(actor, "demo:reset") && (
            <button
              className="button-secondary ml-auto"
              disabled={busy || readOnly}
              onClick={() => {
                if (
                  confirm(
                    "Restore the seed? All local inventory edits and demo requests will be removed. This cannot be undone.",
                  )
                ) {
                  setSelected(null);
                  void mutate("reset");
                }
              }}
            >
              Reset demo data
            </button>
          )}
        </nav>
        <div aria-live="polite" className="mt-4">
          {error && (
            <p role="alert" className="rounded-lg bg-danger/10 p-4 text-danger">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="rounded-lg bg-paper p-4 text-cyan-ink">
              {notice}
            </p>
          )}
        </div>
        {!workspace ? (
          <p className="py-12">Loading demo workspace…</p>
        ) : selected && section === "inventory" ? (
          <div className="mt-6">
            <button
              className="button-secondary mb-5"
              onClick={() => setSelected(null)}
            >
              ← Back to inventory
            </button>
            {selected === "new" || vehicle ? (
              <VehicleEditor
                key={vehicle?.updatedAt ?? "new"}
                vehicle={vehicle}
                editable={editable}
                busy={busy}
                onSave={(input) =>
                  mutate(
                    vehicle ? "update-vehicle" : "create-vehicle",
                    input,
                    vehicle?.id,
                    vehicle?.updatedAt,
                  )
                }
                onPhotos={async (images) =>
                  mutate(
                    "update-vehicle",
                    { images },
                    vehicle?.id,
                    vehicle?.updatedAt,
                  )
                }
                onUpload={async (file) => {
                  if (!vehicle) return;
                  setBusy(true);
                  setError("");
                  try {
                    const data = new FormData();
                    data.set("actor", actorId);
                    data.set("vehicleId", vehicle.id);
                    data.set("updatedAt", vehicle.updatedAt);
                    data.set("photo", file);
                    const r = await fetch("/api/admin/photos", {
                      method: "POST",
                      body: data,
                    });
                    const value = await r.json();
                    if (!r.ok) throw new Error(value.error);
                    await reload();
                    setNotice("Photo saved with 480/960 WebP variants.");
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Upload failed.");
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            ) : (
              <p>Vehicle not found.</p>
            )}
          </div>
        ) : selected && section === "leads" ? (
          <div className="mt-6">
            <button
              className="button-secondary mb-5"
              onClick={() => setSelected(null)}
            >
              ← Back to inbox
            </button>
            {lead ? (
              <LeadEditor
                key={lead.updatedAt}
                lead={lead}
                staff={staff}
                canAssign={can(actor, "leads:assign")}
                disabled={readOnly || busy}
                onSave={(input) =>
                  mutate("update-lead", input, lead.id, lead.updatedAt)
                }
                onNote={(body) => mutate("add-note", { body }, lead.id)}
              />
            ) : (
              <p>This lead is not accessible to the selected demo role.</p>
            )}
          </div>
        ) : (
          <>
            <div className="my-6 flex flex-wrap items-end gap-4">
              <label className="form-label flex-1">
                Search {section}
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={
                    section === "inventory"
                      ? "Make, model, VIN or stock"
                      : "Name, contact or vehicle"
                  }
                />
              </label>
              <label className="form-label">
                Status
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="">All</option>
                  {(section === "inventory"
                    ? VEHICLE_STATUSES
                    : LEAD_STATUSES
                  ).map((s) => (
                    <option value={s} key={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              {section === "inventory" && editable && (
                <button className="button" onClick={() => setSelected("new")}>
                  Add vehicle
                </button>
              )}
            </div>
            <div className="overflow-x-auto rounded-xl border border-line bg-paper">
              <table className="w-full min-w-[650px] text-left text-sm">
                <caption className="sr-only">
                  {section === "inventory"
                    ? "Demo inventory"
                    : "Demo leads visible to this role"}
                </caption>
                <thead className="bg-mist">
                  <tr>
                    {(section === "inventory"
                      ? [
                          "Vehicle",
                          "Stock",
                          "Sale price",
                          "Status",
                          "Publication",
                          "Featured",
                        ]
                      : [
                          "Name",
                          "Request",
                          "Vehicle",
                          "Status",
                          "Assigned",
                          "Data",
                        ]
                    ).map((h) => (
                      <th className="p-4" key={h}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {section === "inventory"
                    ? workspace.vehicles
                        .filter(
                          (v) =>
                            (!status || v.status === status) &&
                            [v.title, v.vin, v.stockNumber]
                              .join(" ")
                              .toLowerCase()
                              .includes(query.toLowerCase()),
                        )
                        .map((v) => (
                          <tr className="border-t border-line" key={v.id}>
                            <td className="p-4">
                              <button
                                className="text-left font-semibold text-cyan-ink underline"
                                onClick={() => setSelected(v.id)}
                              >
                                {v.title}
                              </button>
                            </td>
                            <td className="p-4">{v.stockNumber}</td>
                            <td className="p-4 tabular">
                              {formatPrice(salePriceCents(v.pricing))}
                            </td>
                            <td className="p-4">{v.status}</td>
                            <td className="p-4">{v.publication}</td>
                            <td className="p-4">
                              {v.featured ? `#${v.featuredRank ?? "—"}` : "No"}
                            </td>
                          </tr>
                        ))
                    : workspace.leads
                        .filter(
                          (l) =>
                            (!status || l.status === status) &&
                            [
                              l.firstName,
                              l.lastName,
                              l.email,
                              l.phone,
                              l.vehicleTitle,
                            ]
                              .join(" ")
                              .toLowerCase()
                              .includes(query.toLowerCase()),
                        )
                        .map((l) => (
                          <tr className="border-t border-line" key={l.id}>
                            <td className="p-4">
                              <button
                                className="font-semibold text-cyan-ink underline"
                                onClick={() => setSelected(l.id)}
                              >
                                {l.firstName} {l.lastName}
                              </button>
                            </td>
                            <td className="p-4">{LEAD_TYPE_LABELS[l.type]}</td>
                            <td className="p-4">{l.vehicleTitle ?? "—"}</td>
                            <td className="p-4">{l.status}</td>
                            <td className="p-4">
                              {staff.find((s) => s.id === l.assignedTo)?.name ??
                                "Unassigned"}
                            </td>
                            <td className="p-4">
                              {l.isSynthetic
                                ? "Synthetic sample"
                                : "Demo request"}
                            </td>
                          </tr>
                        ))}
                </tbody>
              </table>
            </div>
            {section === "leads" && workspace.leads.length === 0 && (
              <p className="py-6">
                No leads visible to this role. Sales sees only assigned leads.
              </p>
            )}
          </>
        )}
        <p className="mt-8 text-sm text-slate">
          Post-approval: real staff authentication/MFA, content tools, audit
          log, financing overview, settings, production inventory feeds and lead
          delivery. None are represented as connected here.
        </p>
      </div>
    </main>
  );
}

function VehicleEditor({
  vehicle: v,
  editable,
  busy,
  onSave,
  onPhotos,
  onUpload,
}: {
  vehicle?: Vehicle;
  editable: boolean;
  busy: boolean;
  onSave: (input: unknown) => Promise<boolean>;
  onPhotos: (images: Vehicle["images"]) => Promise<boolean>;
  onUpload: (file: File) => Promise<void>;
}) {
  const field = (
    name: string,
    label: string,
    value: string | number | null | undefined,
    type = "text",
    required = false,
  ) => (
    <label className="form-label" key={name}>
      {label}
      <input
        name={name}
        defaultValue={value ?? ""}
        type={type}
        required={required}
        step={type === "number" ? "any" : undefined}
      />
    </label>
  );
  const select = (
    name: string,
    label: string,
    values: readonly string[],
    value?: string | null,
  ) => (
    <label className="form-label" key={name}>
      {label}
      <select name={name} defaultValue={value ?? ""}>
        <option value="">Not listed</option>
        {values.map((s) => (
          <option value={s} key={s}>
            {s}
          </option>
        ))}
      </select>
    </label>
  );
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const text = (key: string) => String(f.get(key) ?? "");
    const numeric = (key: string) => Number(f.get(key));
    const input = {
      vin: text("vin"),
      stockNumber: text("stockNumber"),
      year: numeric("year"),
      make: text("make"),
      model: text("model"),
      trim: text("trim") || null,
      mileage: numeric("mileage"),
      exteriorColor: text("exteriorColor") || null,
      interiorColor: text("interiorColor") || null,
      bodyType: text("bodyType") || null,
      fuelType: text("fuelType") || null,
      drivetrain: text("drivetrain") || null,
      transmission: text("transmission") || null,
      engine: text("engine") || null,
      horsepower: text("horsepower") || null,
      torque: text("torque") || null,
      mpgCity: text("mpgCity") ? numeric("mpgCity") : null,
      mpgHighway: text("mpgHighway") ? numeric("mpgHighway") : null,
      description: text("description") || null,
      highlights: text("highlights")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      equipment: {
        exterior: text("equipmentExterior")
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        interior: text("equipmentInterior")
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        safety: text("equipmentSafety")
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
      },
      pricing: {
        internetPriceCents: Math.round(numeric("internetPrice") * 100),
        docFeeCents: Math.round(numeric("docFee") * 100),
        smogFeeCents: Math.round(numeric("smogFee") * 100),
        otherFees: v?.pricing.otherFees ?? [],
      },
      ...(v && {
        publication: text("publication"),
        status: text("status"),
        featured: f.get("featured") === "on",
        featuredRank: text("featuredRank") ? numeric("featuredRank") : null,
      }),
    };
    await onSave(input);
  }
  return (
    <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
      <form onSubmit={submit} className="rounded-xl bg-paper p-5 sm:p-8">
        <h1 className="font-display mb-6 text-3xl">
          {v ? "Edit vehicle" : "Add a vehicle"}
        </h1>
        <fieldset disabled={!editable || busy} className="space-y-5">
          <div className="form-grid">
            {field("vin", "VIN", v?.vin, "text", true)}
            {field("stockNumber", "Stock number", v?.stockNumber, "text", true)}
            {field("year", "Year", v?.year, "number", true)}
            {field("make", "Make", v?.make, "text", true)}
            {field("model", "Model", v?.model, "text", true)}
            {field("trim", "Trim", v?.trim)}
            {field("mileage", "Mileage", v?.mileage, "number", true)}
            {field("exteriorColor", "Exterior color", v?.exteriorColor)}
            {field("interiorColor", "Interior color", v?.interiorColor)}
            {select("bodyType", "Body", BODY_TYPES, v?.bodyType)}
            {select("fuelType", "Fuel", FUEL_TYPES, v?.fuelType)}
            {select("drivetrain", "Drivetrain", DRIVETRAINS, v?.drivetrain)}
            {select(
              "transmission",
              "Transmission",
              TRANSMISSIONS,
              v?.transmission,
            )}
            {field("engine", "Engine", v?.engine)}
            {field("horsepower", "Horsepower", v?.horsepower)}
            {field("torque", "Torque", v?.torque)}
            {field("mpgCity", "City MPG", v?.mpgCity, "number")}
            {field("mpgHighway", "Highway MPG", v?.mpgHighway, "number")}
          </div>
          <h2 className="font-display text-xl">Pricing</h2>
          <div className="form-grid">
            {field(
              "internetPrice",
              "Internet price ($)",
              v ? v.pricing.internetPriceCents / 100 : 0,
              "number",
              true,
            )}
            {field(
              "docFee",
              "Doc fee ($)",
              v ? v.pricing.docFeeCents / 100 : 85,
              "number",
              true,
            )}
            {field(
              "smogFee",
              "Smog fee ($)",
              v ? v.pricing.smogFeeCents / 100 : 50,
              "number",
              true,
            )}
          </div>
          <p className="text-sm text-slate">
            Sale price is derived from internet price plus fees. Existing other
            fees are preserved.
          </p>
          <label className="form-label">
            Description
            <textarea
              name="description"
              rows={5}
              defaultValue={v?.description ?? ""}
              maxLength={10000}
            />
          </label>
          <label className="form-label">
            Highlights (one per line)
            <textarea
              name="highlights"
              rows={3}
              defaultValue={v?.highlights.join("\n")}
            />
          </label>
          {(["exterior", "interior", "safety"] as const).map((key) => (
            <label key={key} className="form-label">
              {key} equipment (one per line)
              <textarea
                name={`equipment${key[0].toUpperCase()}${key.slice(1)}`}
                rows={4}
                defaultValue={v?.equipment[key].join("\n")}
              />
            </label>
          ))}
          {v && (
            <div className="form-grid">
              {select("status", "Availability", VEHICLE_STATUSES, v.status)}
              {select(
                "publication",
                "Publication",
                PUBLICATION_STATES,
                v.publication,
              )}
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  name="featured"
                  defaultChecked={v.featured}
                />
                Featured (requires a photo)
              </label>
              {field("featuredRank", "Featured rank", v.featuredRank, "number")}
            </div>
          )}
          <button className="button" disabled={busy}>
            {busy ? "Saving…" : v ? "Save vehicle" : "Create draft vehicle"}
          </button>
        </fieldset>
      </form>
      <aside className="space-y-5">
        <div className="rounded-xl bg-paper p-6">
          <h2 className="font-display text-xl">Photos</h2>
          <p className="mt-2 text-sm text-slate">
            Uploads generate the same 480/960 WebP variants as the seed photos.
            Removing a photo detaches it; files are retained for recovery.
          </p>
          {!v ? (
            <p className="mt-4">Create the draft before adding photos.</p>
          ) : (
            <>
              <label className="form-label mt-4">
                Upload a photo
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={!editable || busy}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void onUpload(f);
                    e.target.value = "";
                  }}
                />
              </label>
              <div className="mt-4 space-y-4">
                {v.images.map((image, i) => (
                  <div
                    key={image.src}
                    className="rounded-lg border border-line p-2"
                  >
                    <VehiclePhoto
                      src={image.src}
                      alt={image.alt}
                      use="thumb"
                      className="aspect-[4/3] w-full rounded object-cover"
                    />
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        className="button-secondary"
                        type="button"
                        disabled={!editable || busy || i === 0}
                        onClick={() => {
                          const images = [...v.images];
                          [images[i - 1], images[i]] = [
                            images[i],
                            images[i - 1],
                          ];
                          void onPhotos(images);
                        }}
                      >
                        Move up
                      </button>
                      <button
                        className="button-secondary"
                        type="button"
                        disabled={!editable || busy}
                        onClick={() => {
                          if (
                            confirm(
                              "Remove this photo from the listing? The original file is retained.",
                            )
                          )
                            void onPhotos(
                              v.images.filter((_, index) => index !== i),
                            );
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        {v && (
          <>
            <Link
              className="button-secondary"
              href={vehicleDetailPath(v)}
              target="_blank"
            >
              View public listing ↗
            </Link>
            <p className="text-sm text-slate">
              Draft, archived and sold listings show an unavailable state
              publicly.
            </p>
            {v.dataQualityFlags.length > 0 && (
              <div className="rounded-xl bg-amber-bg p-5 text-sm text-amber">
                <h2 className="font-bold">Owner-review flags</h2>
                <ul className="mt-3 list-disc space-y-2 pl-5">
                  {v.dataQualityFlags.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </aside>
    </div>
  );
}
function LeadEditor({
  lead,
  staff,
  canAssign,
  disabled,
  onSave,
  onNote,
}: {
  lead: Lead;
  staff: DemoStaffMember[];
  canAssign: boolean;
  disabled: boolean;
  onSave: (input: unknown) => Promise<boolean>;
  onNote: (body: string) => Promise<boolean>;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-xl bg-paper p-6">
        <p className="text-sm text-cyan-ink">
          {lead.isSynthetic ? "Synthetic sample" : "Demo request"} ·{" "}
          {LEAD_TYPE_LABELS[lead.type]}
        </p>
        <h1 className="font-display mt-3 text-3xl">
          {lead.firstName} {lead.lastName}
        </h1>
        <p className="mt-4 break-words">
          {lead.email}
          <br />
          {lead.phone}
        </p>
        <p className="mt-4">{lead.vehicleTitle}</p>
        <p className="mt-4 whitespace-pre-wrap">{lead.message}</p>
        <p className="mt-4 text-sm text-slate">
          Source: {lead.sourcePath}
          <br />
          Received: {new Date(lead.createdAt).toLocaleString()}
        </p>
        {lead.details && (
          <pre className="mt-4 overflow-auto rounded-lg bg-mist p-4 text-xs">
            {JSON.stringify(lead.details, null, 2)}
          </pre>
        )}
        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            void onSave({
              status: f.get("status"),
              ...(canAssign && { assignedTo: f.get("assignedTo") || null }),
            });
          }}
        >
          <fieldset disabled={disabled} className="space-y-4">
            <label className="form-label">
              Status
              <select name="status" defaultValue={lead.status}>
                {LEAD_STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            {canAssign && (
              <label className="form-label">
                Assigned staff
                <select name="assignedTo" defaultValue={lead.assignedTo ?? ""}>
                  <option value="">Unassigned</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button className="button">Save lead status</button>
          </fieldset>
        </form>
      </section>
      <section className="rounded-xl bg-paper p-6">
        <h2 className="font-display text-2xl">Follow-up notes</h2>
        <ul className="mt-4 space-y-3">
          {lead.notes.map((note) => (
            <li key={note.id} className="rounded-lg bg-mist p-4">
              <p className="whitespace-pre-wrap">{note.body}</p>
              <p className="mt-2 text-xs text-slate">
                {staff.find((s) => s.id === note.authorId)?.name ??
                  note.authorId}{" "}
                · {new Date(note.createdAt).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
        <form
          className="mt-5"
          onSubmit={(e) => {
            e.preventDefault();
            void onNote(String(new FormData(e.currentTarget).get("body")));
          }}
        >
          <label className="form-label">
            Add a note
            <textarea
              name="body"
              rows={4}
              required
              maxLength={2000}
              disabled={disabled}
            />
          </label>
          <button className="button mt-3" disabled={disabled}>
            Save note
          </button>
        </form>
      </section>
    </div>
  );
}
