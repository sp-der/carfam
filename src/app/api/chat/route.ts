import { getRepository } from "@/lib/data";
import { allowRequest, sameOrigin } from "@/lib/request-limits";
import {
  chatInputSchema,
  containsSensitiveData,
  executeChatTool,
  parseDemoIntent,
} from "@/lib/chat/assistant";
import { extractAiTool } from "@/lib/chat/anthropic-provider";

export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json({ error: "Origin not allowed." }, { status: 403 });
  if (
    !allowRequest(
      `chat:${request.headers.get("x-forwarded-for") ?? "local"}`,
      12,
    )
  )
    return Response.json(
      { error: "Please wait a minute before sending another message." },
      { status: 429 },
    );
  try {
    const raw = await request.text();
    if (raw.length > 10_000)
      return Response.json({ error: "Message too large." }, { status: 413 });
    const parsed = chatInputSchema.safeParse(JSON.parse(raw));
    if (!parsed.success)
      return Response.json(
        { error: "Please use a shorter message and valid inventory filters." },
        { status: 422 },
      );
    const input = parsed.data;
    const base = {
      filters: input.filters,
      lastResultIds: input.lastResultIds,
      cards: [],
      mode: "demo",
    };
    if (containsSensitiveData(input.message))
      return Response.json({
        ...base,
        message:
          "Please do not share contact, identity or financial details in chat. Use sample details in the demo contact form; credit applications remain with the financing provider.",
        href: "/contact-us",
      });
    const repo = getRepository();
    const makes = [...new Set((await repo.listVehicles()).map((v) => v.make))];
    const intent = parseDemoIntent(input, makes);
    if (typeof intent === "string")
      return Response.json({ ...base, message: intent });
    if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_MODEL) {
      try {
        return Response.json(
          await executeChatTool(
            repo,
            input,
            await extractAiTool(input, makes),
            "ai",
          ),
        );
      } catch {
        if (intent) {
          const reply = await executeChatTool(repo, input, intent);
          return Response.json({
            ...reply,
            message:
              "AI unavailable; using the demo assistant. " + reply.message,
          });
        }
      }
    }
    if (intent)
      return Response.json(await executeChatTool(repo, input, intent));
    return Response.json({
      ...base,
      message:
        "The demo assistant supports make, body style, fuel and under-budget searches, follow-up filters and vehicle navigation. Try ‘Show me Hondas under $15k’ or use the full inventory filters. I won't silently ignore extra criteria.",
    });
  } catch {
    return Response.json(
      {
        error:
          "The assistant could not process that request. Try again or use inventory filters.",
      },
      { status: 400 },
    );
  }
}
