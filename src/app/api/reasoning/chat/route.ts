import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { consume, ipFrom, LIMITS } from "@/lib/rate-limit";
// Uses GROQ_API_KEY — set in Vercel env vars
import {
  streamReasoningReply,
  MAX_MESSAGE_LENGTH,
  MAX_HISTORY_MESSAGES,
  type ChatMessage,
} from "@/lib/reasoning";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Sign in to use the clinical reasoning tool." }, { status: 401 });
  }

  const rateLimitKey = `reasoning:${session.user.id ?? `ip:${ipFrom(req.headers.get("x-forwarded-for"))}`}`;
  if (!(await consume(rateLimitKey, LIMITS.reasoning))) {
    return Response.json(
      { error: "You've reached the hourly limit. Please wait a while and try again." },
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

  const trimmedMessages = messages.slice(-MAX_HISTORY_MESSAGES);

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of streamReasoningReply(trimmedMessages)) {
          controller.enqueue(encoder.encode(chunk));
        }
      } catch (err) {
        console.error("[reasoning] Streaming failed:", err);
        controller.enqueue(
          encoder.encode(
            "Something went wrong. Please try again, or email hello@praxxt.com."
          )
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
