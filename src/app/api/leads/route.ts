import { getRepository } from "@/lib/data";
import {
  DEMO_SUBMISSION_NOTICE,
  submitDemoLead,
} from "@/lib/services/lead-service";
import { allowRequest, sameOrigin } from "@/lib/request-limits";

export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json({ error: "Origin not allowed." }, { status: 403 });
  if (
    !allowRequest(`leads:${request.headers.get("x-forwarded-for") ?? "local"}`)
  )
    return Response.json(
      { error: "Please wait a minute before trying again." },
      { status: 429 },
    );
  try {
    const raw = await request.text();
    if (raw.length > 16_000)
      return Response.json({ error: "Request too large." }, { status: 413 });
    const input = JSON.parse(raw);
    if (input.company) return Response.json({ notice: DEMO_SUBMISSION_NOTICE });
    delete input.company;
    const lead = await submitDemoLead(getRepository(), input);
    return Response.json(
      { notice: DEMO_SUBMISSION_NOTICE, reference: lead.id },
      { status: 201 },
    );
  } catch (error) {
    const e = error as Error & {
      status?: number;
      fieldErrors?: Record<string, string[]>;
    };
    return Response.json(
      {
        error: e.status ? e.message : "Unable to save this demo request.",
        fieldErrors: e.fieldErrors,
      },
      { status: e.status ?? 400 },
    );
  }
}
