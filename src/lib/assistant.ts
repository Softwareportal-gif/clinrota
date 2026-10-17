import Anthropic from "@anthropic-ai/sdk";
import { PRODUCT_DESCRIPTION, LOGIN_ACCESS_FAQ } from "@/lib/faq";

// "Haiku-tier" per the explicit request — this widget answers short FAQ-
// grounded questions, not anything that benefits from a larger model.
const MODEL = "claude-haiku-5-5";
// Claude Haiku 5.5 thinks before answering by default; short FAQ answers
// don't need much of it, and low effort keeps replies quick and cheap.
const EFFORT = "low";

const DECLINED_REPLY =
  "Sorry, I can't help with that one. I can answer questions about using Praxxt, or you can email hello@praxxt.com.";

export const MAX_MESSAGE_LENGTH = 1000;
export const MAX_HISTORY_MESSAGES = 10;

export type ChatMessage = { role: "user" | "assistant"; content: string };

const ROLE_LABELS: Record<string, string> = {
  STUDENT: "a student",
  SUPERVISOR: "a clinical supervisor",
  COORDINATOR: "a program coordinator",
  SUPER_ADMIN: "a super admin",
};

function buildSystemPrompt(role: string | undefined): string {
  const faqText = LOGIN_ACCESS_FAQ.map((item) => `Q: ${item.question}\nA: ${item.answer}`).join(
    "\n\n"
  );

  const roleContext = role
    ? `The visitor is currently signed in as ${ROLE_LABELS[role] ?? role}. You may tailor answers to that role (e.g. a coordinator asking about invites can get the coordinator-specific steps), but don't assume every visitor is signed in.`
    : "This visitor is not signed in.";

  return `You are Beatrice, Praxxt's assistant. You are warm, concise, and use plain language — no jargon. The chat widget already greeted the visitor with your name before they typed anything, so don't reintroduce yourself or say "Hi, I'm Beatrice" again — just answer their question directly.

ABOUT PRAXXT:
${PRODUCT_DESCRIPTION}

${roleContext}

FREQUENTLY ASKED QUESTIONS (use these as your primary source for login/account questions — answer from this content, don't guess):
${faqText}

STRICT RULES — follow these exactly:
1. You ONLY help with Praxxt's own product, accounts, and login/access topics. If asked about anything else — general knowledge, current events, writing essays/code/emails for the visitor, or acting as a general-purpose assistant — politely decline and redirect: say you can only help with using Praxxt, and ask if they have a Praxxt question instead.
2. You NEVER give clinical or medical advice, opinions on patient care, diagnoses, or treatment, under any framing (even "hypothetically" or "just curious"). If asked anything like this, say that you can only help with using Praxxt itself, not clinical questions, and suggest they direct clinical questions to their supervisor or program.
3. If you don't know the answer, or the visitor seems stuck after your answer, suggest they create a support ticket if they're signed in, or email hello@praxxt.com if they're not.
4. Keep responses short — a few sentences, not an essay.`;
}

export async function* streamAssistantReply(
  history: ChatMessage[],
  role: string | undefined
): AsyncGenerator<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Same lazy, friendly-error-at-point-of-use pattern as sendEmail's
    // missing RESEND_API_KEY handling in src/lib/email.ts — no startup
    // schema/crash, just a clear message when the feature is actually used.
    throw new Error("ANTHROPIC_NOT_CONFIGURED");
  }

  const client = new Anthropic({ apiKey });
  const trimmedHistory = history.slice(-MAX_HISTORY_MESSAGES);

  const stream = client.messages.stream({
    model: MODEL,
    // Room for any thinking (it counts toward this cap) plus a short answer.
    max_tokens: 2048,
    output_config: { effort: EFFORT },
    system: buildSystemPrompt(role),
    messages: trimmedHistory,
  });

  // Only the answer text is streamed to the visitor; thinking blocks are
  // skipped.
  let wroteText = false;
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      wroteText = true;
      yield event.delta.text;
    }
  }

  // The model's safety checks can decline a request (stop_reason
  // "refusal"); say so plainly instead of leaving an empty bubble.
  const final = await stream.finalMessage();
  if (final.stop_reason === "refusal" && !wroteText) yield DECLINED_REPLY;
}
