"use server";

import { getRepository } from "@/lib/data";
import { ReadOnlyError } from "@/lib/data/repository";
import { DEMO_SUBMISSION_NOTICE, submitDemoLead } from "@/lib/services/lead-service";
import { ValidationError } from "@/lib/services/inventory-service";

export type InquiryKind = "test-drive" | "question" | "best-price";

export type InquiryState =
  | { status: "idle" }
  | { status: "sent"; notice: string; kind: InquiryKind }
  | { status: "error"; message: string; fieldErrors: Record<string, string[]>; values: Record<string, string> };

const KINDS: readonly InquiryKind[] = ["test-drive", "question", "best-price"];

/**
 * Vehicle inquiry from the detail page. Validated by the shared lead service and stored in the
 * local demo lead store for the admin inbox. Nothing is emailed, texted or sent anywhere.
 */
export async function submitVehicleInquiry(_prev: InquiryState, form: FormData): Promise<InquiryState> {
  const text = (key: string) => String(form.get(key) ?? "").trim();
  const kind = text("kind") as InquiryKind;
  const values = {
    firstName: text("firstName"),
    lastName: text("lastName"),
    email: text("email"),
    phone: text("phone"),
    subject: text("subject"),
    message: text("message"),
  };

  if (!KINDS.includes(kind)) {
    return { status: "error", message: "Choose what you'd like to ask about.", fieldErrors: {}, values };
  }
  // Honeypot: real visitors never see or fill this field.
  if (text("company")) return { status: "sent", notice: DEMO_SUBMISSION_NOTICE, kind };

  const common = {
    firstName: values.firstName,
    lastName: values.lastName,
    email: values.email,
    phone: values.phone,
    sourcePath: text("sourcePath") || "/pre-owned-cars",
    vehicleId: text("vehicleId"),
    message: values.message || undefined,
  };
  const input =
    kind === "test-drive"
      ? { type: "test-drive" as const, ...common }
      : {
          type: "vehicle-inquiry" as const,
          subtype: kind,
          ...common,
          subject: kind === "question" ? values.subject || undefined : undefined,
        };

  try {
    await submitDemoLead(getRepository(), input);
    return { status: "sent", notice: DEMO_SUBMISSION_NOTICE, kind };
  } catch (error) {
    if (error instanceof ValidationError) {
      return { status: "error", message: error.message, fieldErrors: error.fieldErrors, values };
    }
    if (error instanceof ReadOnlyError) {
      return {
        status: "error",
        message: "This preview is read-only, so demo inquiries can't be saved here. Nothing was sent.",
        fieldErrors: {},
        values,
      };
    }
    throw error;
  }
}
