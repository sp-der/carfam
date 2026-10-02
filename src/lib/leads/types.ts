import { z } from "zod";

export const LEAD_TYPES = [
  "contact",
  "test-drive",
  "vehicle-inquiry",
  "trade-appraisal",
  "find-my-car",
  "chatbot-contact",
] as const;
export const LEAD_SUBTYPES = ["best-price", "question", "text-link"] as const;
export const LEAD_STATUSES = ["new", "contacted", "scheduled", "closed"] as const;
export const CONTACT_DEPARTMENTS = ["sales", "finance", "test-drive", "donations"] as const;
export const APPRAISAL_CONDITIONS = ["fair", "good", "very-good", "excellent"] as const;

export type LeadType = (typeof LEAD_TYPES)[number];
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_TYPE_LABELS: Record<LeadType, string> = {
  contact: "Contact",
  "test-drive": "Test drive",
  "vehicle-inquiry": "Vehicle inquiry",
  "trade-appraisal": "Trade appraisal",
  "find-my-car": "Find My Car",
  "chatbot-contact": "Chatbot contact request",
};

const name = z.string().trim().min(1, "Required").max(60);
const email = z.string().trim().toLowerCase().email("Enter a valid email").max(120);
/** US phone: 10 digits after stripping formatting (optional leading 1). */
const phone = z
  .string()
  .trim()
  .transform((v) => v.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, ""))
  .refine((v) => /^\d{10}$/.test(v), "Enter a 10-digit phone number");
const message = z.string().trim().max(2000);
const year = z.number().int().min(1950).max(2100);

export const appraisalDetailsSchema = z
  .object({
    lookup: z.discriminatedUnion("method", [
      z.object({ method: z.literal("vin"), vin: z.string().trim().toUpperCase().regex(/^[A-HJ-NPR-Z0-9]{17}$/, "VIN must be 17 characters (no I, O or Q)") }),
      z.object({ method: z.literal("plate"), plate: z.string().trim().toUpperCase().min(2).max(8), state: z.string().trim().length(2).toUpperCase() }),
      z.object({ method: z.literal("manual"), year, make: z.string().trim().min(1).max(40), model: z.string().trim().min(1).max(60), style: z.string().trim().max(80).optional() }),
    ]),
    mileage: z.number().int().min(0).max(999_999),
    condition: z.enum(APPRAISAL_CONDITIONS),
    zip: z.string().trim().regex(/^\d{5}$/, "Enter a 5-digit ZIP"),
    /** Photos are previewed in the browser only; just the count is recorded. */
    photoCount: z.number().int().min(0).max(20),
  })
  .strict();

export const findMyCarDetailsSchema = z
  .object({
    year: year.optional(),
    make: z.string().trim().max(40).optional(),
    model: z.string().trim().max(60).optional(),
    desiredVehicle: z.string().trim().max(120).optional(),
    priceMin: z.number().int().min(0).max(10_000_000).optional(),
    priceMax: z.number().int().min(0).max(10_000_000).optional(),
  })
  .strict()
  .refine((d) => d.make || d.desiredVehicle, { message: "Choose a make or describe the vehicle", path: ["make"] })
  .refine((d) => d.priceMin == null || d.priceMax == null || d.priceMin <= d.priceMax, {
    message: "Minimum must be ≤ maximum",
    path: ["priceMin"],
  });

const contactFields = {
  firstName: name,
  lastName: name,
  email,
  phone,
  sourcePath: z.string().startsWith("/").max(300),
};

/** Public demo-form submission. Validated server-side; nothing is transmitted anywhere. */
export const leadInputSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("contact"), ...contactFields, department: z.enum(CONTACT_DEPARTMENTS), message: message.min(1, "Required") }).strict(),
  z.object({ type: z.literal("test-drive"), ...contactFields, vehicleId: z.string().min(1), message: message.optional() }).strict(),
  z
    .object({
      type: z.literal("vehicle-inquiry"),
      subtype: z.enum(LEAD_SUBTYPES),
      ...contactFields,
      vehicleId: z.string().min(1),
      subject: z.string().trim().max(120).optional(),
      message: message.optional(),
    })
    .strict(),
  z.object({ type: z.literal("trade-appraisal"), ...contactFields, details: appraisalDetailsSchema, message: message.optional() }).strict(),
  z.object({ type: z.literal("find-my-car"), ...contactFields, details: findMyCarDetailsSchema, message: message.optional() }).strict(),
  z.object({ type: z.literal("chatbot-contact"), ...contactFields, vehicleId: z.string().min(1).optional(), message: message.optional() }).strict(),
]);
export type LeadInput = z.input<typeof leadInputSchema>;
export type ValidLeadInput = z.output<typeof leadInputSchema>;

export interface LeadNote {
  id: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export interface Lead {
  id: string;
  type: LeadType;
  subtype: (typeof LEAD_SUBTYPES)[number] | null;
  status: LeadStatus;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  sourcePath: string;
  vehicleId: string | null;
  /** Vehicle title captured at submission so the lead stays readable if the vehicle changes. */
  vehicleTitle: string | null;
  department: string | null;
  subject: string | null;
  message: string | null;
  details: Record<string, unknown> | null;
  assignedTo: string | null;
  notes: LeadNote[];
  /** Seeded sample data, labeled as such in the inbox. */
  isSynthetic: boolean;
  createdAt: string;
  updatedAt: string;
}

export const leadUpdateSchema = z
  .object({
    status: z.enum(LEAD_STATUSES).optional(),
    assignedTo: z.string().min(1).nullable().optional(),
  })
  .strict();
export type LeadUpdate = z.infer<typeof leadUpdateSchema>;

export const leadNoteSchema = z.object({ body: z.string().trim().min(1).max(2000) }).strict();
