"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { sendMessage, startConversation } from "@/lib/messaging-actions";
import { MAX_MESSAGE_LENGTH } from "@/lib/messaging-limits";

// Keeps an open inbox or conversation current without websockets: re-runs
// the server render every few seconds while the tab is visible.
export function AutoRefresh({ intervalMs = 8000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);
  return null;
}

// Times are formatted in the reader's own browser and timezone; the server
// render can't know it, hence suppressHydrationWarning.
export function LocalTime({ iso, format }: { iso: string; format: "time" | "day" | "short" }) {
  const date = new Date(iso);
  let text: string;
  if (format === "time") {
    text = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  } else if (format === "day") {
    text = date.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  } else {
    const sameDay = date.toDateString() === new Date().toDateString();
    text = sameDay
      ? date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
      : date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  }
  return (
    <time dateTime={iso} suppressHydrationWarning>
      {text}
    </time>
  );
}

export type ThreadMessage = { id: string; body: string; mine: boolean; createdAt: string };

export function MessageList({ messages }: { messages: ThreadMessage[] }) {
  const endRef = useRef<HTMLDivElement>(null);
  const lastId = messages[messages.length - 1]?.id;
  // Follow the newest message as it arrives.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [lastId]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-gray-500">
        No messages yet. Say hello below.
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4 sm:px-6">
      {messages.map((m, i) => {
        const newDay = i === 0 || new Date(messages[i - 1].createdAt).toDateString() !== new Date(m.createdAt).toDateString();
        return (
          <div key={m.id}>
            {newDay && (
              <p className="my-3 text-center text-xs font-medium text-gray-400">
                <LocalTime iso={m.createdAt} format="day" />
              </p>
            )}
            <div className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${
                  m.mine ? "rounded-br-md bg-[#5A3BF0] text-white" : "rounded-bl-md border border-gray-200 bg-white text-gray-800"
                }`}
              >
                <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{m.body}</p>
                <p className={`mt-1 text-right text-[11px] ${m.mine ? "text-white/70" : "text-gray-400"}`}>
                  <LocalTime iso={m.createdAt} format="time" />
                </p>
              </div>
            </div>
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}

export function MessageComposer({ conversationId }: { conversationId: string }) {
  const [state, formAction, isPending] = useActionState(sendMessage.bind(null, conversationId), undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const [length, setLength] = useState(0);

  // Clear the box once a message has actually been sent.
  const sentAt = state?.ok ? state.sentAt : null;
  useEffect(() => {
    if (sentAt) formRef.current?.reset();
  }, [sentAt]);

  return (
    <form
      ref={formRef}
      action={formAction}
      onReset={() => setLength(0)}
      className="border-t border-gray-200 bg-white px-4 py-3 sm:px-6"
    >
      <div className="flex items-end gap-2">
        <label htmlFor={`body-${conversationId}`} className="sr-only">
          Message
        </label>
        <textarea
          id={`body-${conversationId}`}
          name="body"
          rows={2}
          required
          maxLength={MAX_MESSAGE_LENGTH}
          placeholder="Write a message…"
          onChange={(e) => setLength(e.target.value.length)}
          onKeyDown={(e) => {
            // Enter sends; Shift+Enter starts a new line.
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          className="max-h-40 min-h-[2.75rem] flex-1 resize-y rounded-xl border border-gray-300 px-3 py-2 text-base sm:text-sm"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {isPending ? "Sending…" : "Send"}
        </button>
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-3 text-xs text-gray-400">
        <span>Don&apos;t include patient names, ID numbers or contact details.</span>
        {length > MAX_MESSAGE_LENGTH * 0.8 && (
          <span>
            {length}/{MAX_MESSAGE_LENGTH}
          </span>
        )}
      </div>
      {state && !state.ok && <p className="mt-1 text-sm text-red-600">{state.error}</p>}
    </form>
  );
}

export type ContactOption = { id: string; name: string; detail: string; initial: string };

export function ContactPicker({ contacts }: { contacts: ContactOption[] }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const shown = q ? contacts.filter((c) => `${c.name} ${c.detail}`.toLowerCase().includes(q)) : contacts;

  if (contacts.length === 0) {
    return (
      <p className="px-6 py-10 text-center text-sm text-gray-500">
        There&apos;s no one you can message yet. Contacts appear once you&apos;re part of a program or placement.
      </p>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-gray-200 px-4 py-3 sm:px-6">
        <label htmlFor="contact-search" className="sr-only">
          Search people
        </label>
        <input
          id="contact-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, role or site"
          className="w-full rounded-xl border border-gray-300 px-3 py-2 text-base sm:text-sm"
        />
      </div>
      <ul className="flex-1 divide-y divide-gray-100 overflow-y-auto">
        {shown.map((c) => (
          <li key={c.id}>
            <form action={startConversation.bind(null, c.id)}>
              <button type="submit" className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 sm:px-6">
                <Avatar initial={c.initial} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-gray-900">{c.name}</span>
                  <span className="block truncate text-xs text-gray-500">{c.detail}</span>
                </span>
              </button>
            </form>
          </li>
        ))}
        {shown.length === 0 && <li className="px-6 py-8 text-center text-sm text-gray-500">No one matches “{query}”.</li>}
      </ul>
    </div>
  );
}

export function Avatar({ initial }: { initial: string }) {
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
      style={{ background: "linear-gradient(135deg, #5A3BF0, #2563EB)" }}
      aria-hidden="true"
    >
      {initial}
    </span>
  );
}
