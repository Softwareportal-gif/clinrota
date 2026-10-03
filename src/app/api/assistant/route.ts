import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import {
  checkRateLimit,
  streamAssistantReply,
  MAX_MESSAGE_LENGTH,
  MAX_HISTORY_MESSAGES,
  type ChatMessage,
} from "@/lib/assistant";

// Reachable without login (Beatrice is site-wide, including the public
// landing page), so every guard below runs before this ever calls the
// paid Claude API — never trust the client's own "valid" state.
export async function POST(req: NextRequest) {
  const session = await auth();

  // Prefer the signed-in user's id (stable per person); anonymous
  // visitors are keyed by IP, same rationale as any lightweight rate
  // limiter for a single-instance pilot deployment.
  const forwardedFor = req.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || "unknown";
  const rateLimitKey = session?.user?.id ?? `ip:${ip}`;

  if (!checkRateLimit(rateLimitKey)) {
    return Response.json(
      { error: "You're sending messages too quickly. Please wait a few minutes and try again." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const rawMessages =
    body && typeof body === "object" && Array.isArray((body as { messages?: unknown }).messages)
      ? (body as { messages: unknown[] }).messages
      : null;
  if (!rawMessages || rawMessages.length === 0) {
    return Response.json({ error: "No message provided." }, { status: 400 });
  }

  const messages: ChatMessage[] = [];
  for (const m of rawMessages) {
    if (
      !m ||
      typeof m !== "object" ||
      ((m as { role?: unknown }).role !== "user" && (m as { role?: unknown }).role !== "assistant") ||
      typeof (m as { content?: unknown }).content !== "string"
    ) {
      return Response.json({ error: "Invalid message format." }, { status: 400 });
    }
    const { role, content } = m as { role: "user" | "assistant"; content: string };
    if (content.length === 0) {
      return Response.json({ error: "No message provided." }, { status: 400 });
    }
    if (content.length > MAX_MESSAGE_LENGTH) {
      return Response.json(
        { error: `Messages are limited to ${MAX_MESSAGE_LENGTH} characters.` },
        { status: 400 }
      );
    }
    messages.push({ role, content });
  }

  // Cap conversation history sent to the API — a long back-and-forth
  // shouldn't silently balloon token usage/cost on every turn.
  const trimmedMessages = messages.slice(-MAX_HISTORY_MESSAGES);

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of streamAssistantReply(trimmedMessages, session?.user?.role)) {
          controller.enqueue(encoder.encode(chunk));
        }
      } catch (err) {
        console.error("[assistant] Failed to get a reply:", err);
        const message =
          err instanceof Error && err.message === "ANTHROPIC_NOT_CONFIGURED"
            ? "Beatrice isn't set up yet — contact your system administrator, or email hello@clinrota.com."
            : "Something went wrong on my end. Please try again, or email hello@clinrota.com.";
        controller.enqueue(encoder.encode(message));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
