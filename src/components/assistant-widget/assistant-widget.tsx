"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { ChatBubbleIcon, CloseIcon, SendIcon } from "./icons";

const INK = "#17153B";
const ACCENT = "#5A3BF0";

// Conversation state lives in memory for this page session only — no
// persistence to the database or browser storage. (A future enhancement
// worth considering: logging common questions, stripped of anything
// identifying, to spot real gaps in the /help FAQ — deliberately out of
// scope for this first pass to keep the privacy footprint minimal.)
type Message = { role: "user" | "assistant"; content: string };

const MAX_MESSAGE_LENGTH = 1000;

function suggestsTicket(text: string): boolean {
  return /\bticket\b/i.test(text) || text.toLowerCase().includes("hello@praxxt.com");
}

function buildTicketPrefill(messages: Message[]): { subject: string; description: string } {
  const firstUserMessage = messages.find((m) => m.role === "user")?.content ?? "";
  const subject = firstUserMessage.slice(0, 80) || "Question from Beatrice chat";
  const description = messages
    .map((m) => `${m.role === "user" ? "You" : "Beatrice"}: ${m.content}`)
    .join("\n\n")
    .slice(0, 2000);
  return { subject, description };
}

export function AssistantWidget() {
  // useSession(), not a server-supplied prop — so the root layout doesn't
  // need to call auth() itself, which would force every page in the app
  // (including the static landing/login pages) to render dynamically.
  const { data: session } = useSession();
  const isSignedIn = !!session?.user;
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isStreaming) return;
    if (text.length > MAX_MESSAGE_LENGTH) {
      setError(`Messages are limited to ${MAX_MESSAGE_LENGTH} characters.`);
      return;
    }

    setError(null);
    setInput("");
    const outgoing: Message[] = [...messages, { role: "user", content: text }];
    setMessages([...outgoing, { role: "assistant", content: "" }]);
    setIsStreaming(true);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: outgoing }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Something went wrong. Please try again.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantText += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: assistantText };
          return updated;
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsStreaming(false);
    }
  }

  const lastAssistantMessage = [...messages].reverse().find((m) => m.role === "assistant");
  const showTicketPrompt =
    !isStreaming && lastAssistantMessage && suggestsTicket(lastAssistantMessage.content);
  const ticketPrefill = showTicketPrompt ? buildTicketPrefill(messages) : null;

  // The Body Explorer is full-screen, and the bubble would sit on its toolbar.
  if (pathname?.startsWith("/anatomy")) return null;

  return (
    <>
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 flex h-[520px] w-[360px] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ backgroundColor: INK }}
          >
            <div className="flex items-center gap-2.5">
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: ACCENT }}
              >
                B
              </span>
              <span className="text-sm font-bold text-white">Beatrice</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
              className="text-white/70 hover:text-white"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 && (
              <div className="rounded-2xl rounded-tl-sm bg-gray-100 px-3 py-2 text-sm text-gray-700">
                Hi, I&apos;m Beatrice — ask me anything about using Praxxt: getting access,
                signing in, or how a feature works.
              </div>
            )}

            {messages.map((message, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                  message.role === "user"
                    ? "ml-auto rounded-br-sm text-white"
                    : "rounded-tl-sm bg-gray-100 text-gray-700"
                }`}
                style={message.role === "user" ? { backgroundColor: ACCENT } : undefined}
              >
                {message.content || (isStreaming && i === messages.length - 1 ? "…" : "")}
              </div>
            ))}

            {showTicketPrompt && ticketPrefill && (
              <div className="rounded-2xl border border-gray-200 bg-white p-3 text-xs text-gray-600">
                <p className="mb-2">Still stuck?</p>
                {isSignedIn ? (
                  <Link
                    href={`/help/tickets?subject=${encodeURIComponent(ticketPrefill.subject)}&description=${encodeURIComponent(ticketPrefill.description)}`}
                    className="inline-block rounded-md px-3 py-1.5 text-xs font-semibold text-white"
                    style={{ backgroundColor: INK }}
                  >
                    Create a ticket
                  </Link>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href="/login?callbackUrl=/help/tickets"
                      className="inline-block rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700"
                    >
                      Sign in to create a ticket
                    </Link>
                    <a
                      href="mailto:hello@praxxt.com"
                      className="inline-block rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700"
                    >
                      Email hello@praxxt.com
                    </a>
                  </div>
                )}
              </div>
            )}

            {error && <p className="text-xs text-red-600">{error}</p>}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={sendMessage} className="flex items-center gap-2 border-t border-gray-100 p-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={MAX_MESSAGE_LENGTH}
              placeholder="Ask a question..."
              disabled={isStreaming}
              className="flex-1 rounded-full border border-gray-300 px-3 py-2 text-sm focus:border-[#5A3BF0] focus:outline-none disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={isStreaming || !input.trim()}
              aria-label="Send message"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white disabled:opacity-40"
              style={{ backgroundColor: ACCENT }}
            >
              <SendIcon className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-label={isOpen ? "Close Beatrice chat" : "Open Beatrice chat"}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition hover:opacity-90"
        style={{ backgroundColor: ACCENT }}
      >
        {isOpen ? <CloseIcon className="h-6 w-6" /> : <ChatBubbleIcon className="h-6 w-6" />}
      </button>
    </>
  );
}
