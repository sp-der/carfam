"use client";

import {
  createContext,
  startTransition,
  use,
  useActionState,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CheckIcon, CloseIcon } from "@/components/icons";
import {
  submitVehicleInquiry,
  type InquiryKind,
  type InquiryState,
} from "@/app/(site)/pre-owned-cars/detail/[slug]/[id]/actions";

const KIND_LABELS: Record<InquiryKind, { action: string; heading: string; sent: string }> = {
  "test-drive": {
    action: "Schedule a test drive",
    heading: "Request a test drive",
    sent: "Test drive request saved",
  },
  question: { action: "Ask a question", heading: "Ask a question", sent: "Question saved" },
  "best-price": { action: "Get our best price", heading: "Get our best price", sent: "Price request saved" },
};

const Ctx = createContext<((kind: InquiryKind) => void) | null>(null);

export function useOpenInquiry() {
  const open = use(Ctx);
  if (!open) throw new Error("useOpenInquiry must be used inside InquiryProvider");
  return open;
}

/** One inquiry dialog per detail page; any action button can open it with a preselected kind. */
export function InquiryProvider({
  vehicleId,
  title,
  sourcePath,
  children,
}: {
  vehicleId: string;
  title: string;
  sourcePath: string;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [kind, setKind] = useState<InquiryKind>("test-drive");
  // Bumping the key gives each opening a fresh form after a successful send.
  const [formKey, setFormKey] = useState(0);
  const [sentOnce, setSentOnce] = useState(false);

  const open = (k: InquiryKind) => {
    setKind(k);
    if (sentOnce) {
      setFormKey((n) => n + 1);
      setSentOnce(false);
    }
    dialog.current?.showModal();
  };

  return (
    <Ctx value={open}>
      {children}
      <dialog
        ref={dialog}
        aria-labelledby="inquiry-title"
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current.close();
        }}
        className="m-auto max-h-[min(100dvh,52rem)] w-[min(100vw-1rem,34rem)] max-w-none rounded-md bg-paper p-0 text-ink shadow-2xl"
      >
        <InquiryForm
          key={formKey}
          kind={kind}
          onKindChange={setKind}
          vehicleId={vehicleId}
          title={title}
          sourcePath={sourcePath}
          onSent={() => setSentOnce(true)}
          onClose={() => dialog.current?.close()}
        />
      </dialog>
    </Ctx>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string[];
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold">
        {label}
      </label>
      {children}
      {error?.length ? (
        <p id={`${id}-error`} className="mt-1 text-sm font-semibold text-danger">
          {error[0]}
        </p>
      ) : null}
    </div>
  );
}

function InquiryForm({
  kind,
  onKindChange,
  vehicleId,
  title,
  sourcePath,
  onSent,
  onClose,
}: {
  kind: InquiryKind;
  onKindChange: (k: InquiryKind) => void;
  vehicleId: string;
  title: string;
  sourcePath: string;
  onSent: () => void;
  onClose: () => void;
}) {
  const id = useId();
  const [state, action, pending] = useActionState<InquiryState, FormData>(submitVehicleInquiry, { status: "idle" });
  const errors = state.status === "error" ? state.fieldErrors : {};
  const values = state.status === "error" ? state.values : {};
  const firstError = useRef<HTMLParagraphElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "sent") onSent();
    if (state.status === "error") {
      // Focus the first invalid field; fall back to the error summary (e.g. read-only preview).
      const field = formRef.current?.querySelector<HTMLElement>("[aria-invalid=true]");
      (field ?? firstError.current)?.focus();
    }
  }, [state, onSent]);

  const input =
    "min-h-12 w-full rounded-md border border-line bg-paper px-3 text-base aria-[invalid=true]:border-danger";
  const fieldProps = (name: string, autoComplete?: string) => ({
    id: `${id}-${name}`,
    name,
    autoComplete,
    defaultValue: values[name] ?? "",
    "aria-invalid": errors[name]?.length ? true : undefined,
    "aria-describedby": errors[name]?.length ? `${id}-${name}-error` : undefined,
    className: input,
  });

  return (
    <div className="flex max-h-[inherit] flex-col">
      <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
        <div>
          <h2 id="inquiry-title" className="font-display text-xl">
            {state.status === "sent" ? KIND_LABELS[state.kind].sent : KIND_LABELS[kind].heading}
          </h2>
          <p className="mt-0.5 text-sm text-slate">{title}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="-mr-2 inline-flex min-h-11 min-w-11 items-center justify-center rounded-md"
          aria-label="Close"
        >
          <CloseIcon className="size-6" />
        </button>
      </div>

      {state.status === "sent" ? (
        <div className="px-5 py-6 sm:px-6" role="status">
          <p className="flex items-center gap-2 text-lg font-bold">
            <CheckIcon className="size-6 text-cyan-ink" />
            {state.notice}
          </p>
          <p className="mt-3 text-slate">
            Your request was saved to the demo lead inbox so staff can see how it would arrive. No email, text or
            call will be made.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-6 min-h-12 rounded-md bg-ink px-5 font-bold text-paper hover:bg-graphite-3"
          >
            Done
          </button>
        </div>
      ) : (
        <form
          ref={formRef}
          // Submitted via onSubmit (not `action`) so React doesn't reset the form after a failed
          // attempt: typed values and the chosen request type stay exactly as the shopper left them.
          onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            startTransition(() => action(data));
          }}
          noValidate
          className="overflow-y-auto overscroll-contain px-5 py-5 sm:px-6"
        >
          <input type="hidden" name="vehicleId" value={vehicleId} />
          <input type="hidden" name="sourcePath" value={sourcePath} />
          <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
            <label htmlFor={`${id}-company`}>Company</label>
            <input id={`${id}-company`} name="company" tabIndex={-1} autoComplete="off" />
          </div>

          {state.status === "error" ? (
            <p
              ref={firstError}
              tabIndex={-1}
              role="alert"
              className="mb-4 rounded-md bg-danger/10 px-3 py-2 text-sm font-semibold text-danger"
            >
              {state.message}
            </p>
          ) : null}

          <fieldset>
            <legend className="mb-2 text-sm font-semibold">What would you like?</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {(Object.keys(KIND_LABELS) as InquiryKind[]).map((k) => (
                <label
                  key={k}
                  className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-line px-3 text-sm font-semibold hover:border-ink has-[:checked]:border-cyan-ink has-[:checked]:bg-cyan/10"
                >
                  <input
                    type="radio"
                    name="kind"
                    value={k}
                    checked={kind === k}
                    onChange={() => onKindChange(k)}
                    className="accent-cyan-ink"
                  />
                  {k === "test-drive" ? "Test drive" : k === "question" ? "Question" : "Best price"}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field id={`${id}-firstName`} label="First name" error={errors.firstName}>
              <input {...fieldProps("firstName", "given-name")} required />
            </Field>
            <Field id={`${id}-lastName`} label="Last name" error={errors.lastName}>
              <input {...fieldProps("lastName", "family-name")} required />
            </Field>
            <Field id={`${id}-phone`} label="Phone" error={errors.phone}>
              <input {...fieldProps("phone", "tel")} type="tel" inputMode="tel" required />
            </Field>
            <Field id={`${id}-email`} label="Email" error={errors.email}>
              <input {...fieldProps("email", "email")} type="email" inputMode="email" spellCheck={false} required />
            </Field>
            {kind === "question" ? (
              <div className="sm:col-span-2">
                <Field id={`${id}-subject`} label="Subject (optional)" error={errors.subject}>
                  <input {...fieldProps("subject")} maxLength={120} />
                </Field>
              </div>
            ) : null}
            <div className="sm:col-span-2">
              <Field
                id={`${id}-message`}
                label={kind === "question" ? "Your question" : "Anything else? (optional)"}
                error={errors.message}
              >
                <textarea {...fieldProps("message")} rows={3} maxLength={2000} className={`${input} py-2`} />
              </Field>
            </div>
          </div>
          {kind === "test-drive" ? (
            <p className="mt-3 text-sm text-slate">
              This asks the dealer to contact you. It doesn’t book a confirmed appointment.
            </p>
          ) : null}

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold">Demo only—nothing is sent.</p>
            <button
              type="submit"
              disabled={pending}
              className="min-h-12 rounded-md bg-pink px-6 font-bold text-ink hover:bg-pink-soft disabled:opacity-60"
            >
              {pending ? "Saving…" : KIND_LABELS[kind].action}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export function InquiryButton({
  kind,
  variant = "primary",
  className = "",
}: {
  kind: InquiryKind;
  variant?: "primary" | "secondary";
  className?: string;
}) {
  const open = useOpenInquiry();
  const style =
    variant === "primary"
      ? "bg-pink text-ink hover:bg-pink-soft"
      : "border border-line bg-paper text-ink hover:border-ink";
  return (
    <button
      type="button"
      onClick={() => open(kind)}
      aria-haspopup="dialog"
      className={`inline-flex min-h-12 items-center justify-center rounded-md px-4 font-bold ${style} ${className}`}
    >
      {KIND_LABELS[kind].action}
    </button>
  );
}
