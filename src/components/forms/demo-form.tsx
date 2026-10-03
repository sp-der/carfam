"use client";

import { useRef, useState, type FormEvent } from "react";
import { usePathname } from "next/navigation";
import {
  APPRAISAL_CONDITIONS,
  CONTACT_DEPARTMENTS,
  appraisalDetailsSchema,
} from "@/lib/leads/types";

export function DemoForm({
  kind,
}: {
  kind: "contact" | "find-my-car" | "trade-appraisal" | "chatbot-contact";
}) {
  const path = usePathname();
  const form = useRef<HTMLFormElement>(null);
  const summary = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const [method, setMethod] = useState("manual");
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [review, setReview] = useState<Record<string, string>>({});
  const appraisal = kind === "trade-appraisal";
  const number = (data: FormData, key: string) => Number(data.get(key));
  const text = (data: FormData, key: string) =>
    String(data.get(key) ?? "").trim();
  const details = (data: FormData) => ({
    lookup:
      method === "vin"
        ? { method, vin: text(data, "vin") }
        : method === "plate"
          ? { method, plate: text(data, "plate"), state: text(data, "state") }
          : {
              method,
              year: number(data, "year"),
              make: text(data, "make"),
              model: text(data, "model"),
              style: text(data, "style"),
            },
    mileage: number(data, "mileage"),
    condition: text(data, "condition"),
    zip: text(data, "zip"),
    photoCount: photos.length,
  });
  function next() {
    if (!form.current) return;
    const data = new FormData(form.current);
    if (step === 0) {
      const parsed = appraisalDetailsSchema.safeParse({
        ...details(data),
        zip: "00000",
      });
      if (!parsed.success) {
        setError(parsed.error.issues[0].message);
        return;
      }
    }
    const fields = form.current.querySelectorAll<HTMLInputElement>(
      `[data-step="${step}"] input, [data-step="${step}"] select`,
    );
    for (const field of fields) if (!field.reportValidity()) return;
    setError("");
    setReview(
      Object.fromEntries(
        [...data.entries()].filter(([, value]) => typeof value === "string"),
      ) as Record<string, string>,
    );
    setStep(step + 1);
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (appraisal && step < 3) {
      next();
      return;
    }
    const data = new FormData(e.currentTarget);
    const common = {
      firstName: text(data, "firstName"),
      lastName: text(data, "lastName"),
      email: text(data, "email"),
      phone: text(data, "phone"),
      message: text(data, "message"),
      sourcePath: path,
      company: text(data, "company"),
    };
    const input =
      kind === "contact"
        ? { ...common, type: kind, department: text(data, "department") }
        : kind === "find-my-car"
          ? {
              ...common,
              type: kind,
              details: {
                make: text(data, "make"),
                model: text(data, "model"),
                desiredVehicle: text(data, "desiredVehicle"),
                ...(text(data, "year") && { year: number(data, "year") }),
                ...(text(data, "priceMin") && {
                  priceMin: number(data, "priceMin"),
                }),
                ...(text(data, "priceMax") && {
                  priceMax: number(data, "priceMax"),
                }),
              },
            }
          : kind === "trade-appraisal"
            ? { ...common, type: kind, details: details(data) }
            : { ...common, type: kind };
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          [
            result.error,
            ...Object.values(result.fieldErrors ?? {}).flat(),
          ].join(" "),
        );
      setNotice(result.notice);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
      setTimeout(() => summary.current?.focus(), 0);
    }
  }
  const field = (
    name: string,
    label: string,
    type = "text",
    required = false,
  ) => (
    <label className="form-label" key={name}>
      {label}
      <input
        name={name}
        type={type}
        required={required}
        maxLength={type === "email" ? 120 : 80}
        min={type === "number" ? 0 : undefined}
      />
    </label>
  );
  if (notice)
    return (
      <div
        tabIndex={-1}
        ref={summary}
        role="status"
        className="rounded-xl border border-cyan-ink bg-mist p-8"
      >
        <h2 className="font-display text-2xl">{notice}</h2>
        <p className="mt-3">
          Saved in the local demo inbox. No email, text, valuation, credit check
          or appointment was sent or confirmed.
        </p>
        <button
          className="button mt-5"
          onClick={() => {
            setNotice("");
            setStep(0);
          }}
        >
          Start another demo request
        </button>
      </div>
    );
  return (
    <form
      ref={form}
      onSubmit={submit}
      className="space-y-6 rounded-xl border border-line bg-paper p-5 sm:p-8"
    >
      <p className="text-sm font-bold text-cyan-ink">
        Demo only—nothing is sent. Use sample contact details.
      </p>
      <div className="sr-only" aria-hidden>
        <label>
          Company
          <input name="company" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {error && (
        <div
          role="alert"
          tabIndex={-1}
          ref={summary}
          className="rounded-md bg-danger/10 p-3 text-danger"
        >
          {error}
        </div>
      )}
      {appraisal && (
        <ol
          className="flex flex-wrap gap-3 text-sm"
          aria-label="Appraisal progress"
        >
          {["Vehicle", "Photos", "Contact", "Review"].map((s, i) => (
            <li
              key={s}
              aria-current={step === i ? "step" : undefined}
              className={step === i ? "font-bold text-cyan-ink" : "text-slate"}
            >
              {i + 1}. {s}
            </li>
          ))}
        </ol>
      )}
      {appraisal && (
        <>
          <div hidden={step !== 0} data-step="0" className="space-y-4">
            <label className="form-label">
              Identify your vehicle
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
              >
                <option value="manual">Enter vehicle details</option>
                <option value="vin">I know the VIN</option>
                <option value="plate">License plate</option>
              </select>
            </label>
            <p className="text-sm text-slate">
              No external lookup runs. These details describe your demo request
              only.
            </p>
            {method === "vin" ? (
              field("vin", "VIN", "text", true)
            ) : method === "plate" ? (
              <div className="form-grid">
                {field("plate", "Plate", "text", true)}
                {field("state", "State abbreviation", "text", true)}
              </div>
            ) : (
              <div className="form-grid">
                {field("year", "Year", "number", true)}
                {field("make", "Make", "text", true)}
                {field("model", "Model", "text", true)}
                {field("style", "Style / trim")}
              </div>
            )}
            <div className="form-grid">
              {field("mileage", "Mileage", "number", true)}
              <label className="form-label">
                Condition
                <select name="condition">
                  {APPRAISAL_CONDITIONS.map((c) => (
                    <option key={c} value={c}>
                      {c.replaceAll("-", " ")}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          <div hidden={step !== 1} data-step="1" className="space-y-4">
            <label className="form-label">
              Optional photos (up to 20; browser preview only)
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(e) => {
                  photos.forEach(URL.revokeObjectURL);
                  const files = [...(e.target.files ?? [])]
                    .slice(0, 20)
                    .filter(
                      (f) =>
                        f.size <= 8 * 1024 * 1024 &&
                        ["image/jpeg", "image/png", "image/webp"].includes(
                          f.type,
                        ),
                    );
                  setPhotos(files.map((f) => URL.createObjectURL(f)));
                }}
              />
            </label>
            <p className="text-sm text-slate">
              Photos are not uploaded. Only the count is recorded.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {photos.map((src, i) => (
                <div
                  key={src}
                  className="aspect-square rounded bg-mist"
                  role="img"
                  aria-label={`Preview photo ${i + 1}`}
                  style={{
                    backgroundImage: `url(${src})`,
                    backgroundSize: "cover",
                  }}
                />
              ))}
            </div>
          </div>
        </>
      )}
      {kind === "find-my-car" && (
        <div className="form-grid">
          {field("year", "Year (optional)", "number")}
          {field("make", "Make")}
          {field("model", "Model")}
          {field("desiredVehicle", "Describe your desired vehicle")}
          {field("priceMin", "Minimum budget ($)", "number")}
          {field("priceMax", "Maximum budget ($)", "number")}
        </div>
      )}
      <div hidden={appraisal && step !== 2} data-step="2" className="space-y-4">
        <div className="form-grid">
          {field("firstName", "First name", "text", true)}
          {field("lastName", "Last name", "text", true)}
          {field("email", "Email", "email", true)}
          {field("phone", "Phone", "tel", true)}
          {appraisal && field("zip", "ZIP code", "text", true)}
        </div>
        {kind === "contact" && (
          <label className="form-label">
            Subject
            <select name="department">
              {CONTACT_DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d.replaceAll("-", " ")}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="form-label">
          {kind === "contact" ? "Message" : "Additional comments (optional)"}
          <textarea
            name="message"
            rows={4}
            maxLength={2000}
            required={kind === "contact"}
          />
        </label>
      </div>
      {appraisal && step === 3 && (
        <div>
          <h2 className="font-display text-xl">Review your demo request</h2>
          <dl className="mt-4 space-y-2">
            {Object.entries(review)
              .filter(([k]) => k !== "company")
              .map(
                ([k, value]) =>
                  value && (
                    <div key={k} className="grid grid-cols-2 gap-3">
                      <dt className="text-slate">{k}</dt>
                      <dd className="break-words">{value}</dd>
                    </div>
                  ),
              )}
          </dl>
          <p className="mt-3">
            {photos.length} photo previews; no uploads. No valuation is
            generated.
          </p>
        </div>
      )}
      <div className="flex gap-3">
        {appraisal && step > 0 && (
          <button
            className="button-secondary"
            type="button"
            onClick={() => {
              setStep(step - 1);
              setError("");
            }}
          >
            Back
          </button>
        )}
        {appraisal && step < 3 ? (
          <button className="button" type="button" onClick={next}>
            Continue
          </button>
        ) : (
          <button className="button" disabled={busy}>
            {busy ? "Saving…" : "Save demo request"}
          </button>
        )}
      </div>
    </form>
  );
}
