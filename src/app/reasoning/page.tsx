"use client";

import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Message = { role: "user" | "assistant"; content: string };

const STARTER_PROMPTS = [
  { label: "RUQ pain workup", text: "A 35-year-old woman presents with 2 days of right upper quadrant pain, nausea, and low-grade fever. Walk me through this case." },
  { label: "Acute breathlessness", text: "What is the systematic approach to a patient presenting with acute shortness of breath?" },
  { label: "Haemoptysis in a young man", text: "Help me work through the differential for a 22-year-old man with haemoptysis." },
  { label: "Chest pain approach", text: "Explain the clinical reasoning approach to a patient presenting with chest pain." },
];

export default function ReasoningPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setError("");
    const userMsg: Message = { role: "user", content: trimmed };
    const nextMessages: Message[] = [...messages, userMsg];
    setMessages([...nextMessages, { role: "assistant", content: "" }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/reasoning/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Request failed");
      }

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: full };
          return updated;
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setError(msg);
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    send(input);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-gray-50">
      {/* Disclaimer banner */}
      <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-800">
        Educational use only — not for real patient care decisions. Emergency? Call 999 / 112.
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          /* Empty state */
          <div className="mx-auto flex max-w-2xl flex-col items-center px-4 pt-16 pb-8 sm:px-6">
            <div className="mb-5 flex size-16 items-center justify-center rounded-2xl bg-blue-600 shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="size-8">
                <path d="M11.25 4.533A9.707 9.707 0 0 0 6 3a9.735 9.735 0 0 0-3.25.555.75.75 0 0 0-.5.707v14.25a.75.75 0 0 0 1 .707A8.237 8.237 0 0 1 6 18.75c1.995 0 3.823.707 5.25 1.886V4.533ZM12.75 20.636A8.214 8.214 0 0 1 18 18.75c.966 0 1.89.166 2.75.47a.75.75 0 0 0 1-.708V4.262a.75.75 0 0 0-.5-.707A9.735 9.735 0 0 0 18 3a9.707 9.707 0 0 0-5.25 1.533v16.103Z" />
              </svg>
            </div>
            <h1 className="mb-2 text-2xl font-bold text-gray-900">Clinical Reasoning AI</h1>
            <p className="mb-2 text-center text-sm text-gray-500 max-w-md">
              Present a case, explore a differential, or discuss evidence-based management. I&apos;ll guide you through it step by step.
            </p>
            <p className="mb-8 text-center text-xs text-gray-400">Powered by Praxxt Reason · West Africa clinical context</p>
            <div className="w-full grid grid-cols-1 gap-2 sm:grid-cols-2">
              {STARTER_PROMPTS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => send(p.text)}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-blue-300 hover:shadow-md"
                >
                  <span className="block text-sm font-medium text-gray-800">{p.label}</span>
                  <span className="mt-0.5 block text-xs text-gray-400 line-clamp-2">{p.text}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Messages */
          <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 sm:px-6">
            {messages.map((msg, i) => (
              <div key={i} className={msg.role === "user" ? "flex justify-end" : "flex items-start gap-3"}>
                {msg.role === "assistant" && (
                  <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-600 shadow-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="white" className="size-4">
                      <path d="M7.25 3.688a8.035 8.035 0 0 0-2.75-.488 8.06 8.06 0 0 0-2.5.395v9.804a6.585 6.585 0 0 1 2.5-.487c1.095 0 2.115.28 3 .775V3.688ZM8.75 13.687a6.585 6.585 0 0 1 3-.775c.88 0 1.72.165 2.5.487V3.595A8.06 8.06 0 0 0 11.75 3.2a8.035 8.035 0 0 0-3 .488v9.999Z" />
                    </svg>
                  </div>
                )}

                {msg.role === "user" ? (
                  <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-blue-600 px-4 py-3 text-sm text-white leading-relaxed">
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                ) : (
                  <div className="min-w-0 flex-1 rounded-2xl rounded-tl-sm bg-white px-5 py-4 text-sm text-gray-800 shadow-sm ring-1 ring-gray-200">
                    {msg.content === "" && loading && i === messages.length - 1 ? (
                      <span className="inline-flex items-center gap-1.5 text-gray-400">
                        <span className="size-1.5 rounded-full bg-current animate-bounce" />
                        <span className="size-1.5 rounded-full bg-current animate-bounce [animation-delay:0.15s]" />
                        <span className="size-1.5 rounded-full bg-current animate-bounce [animation-delay:0.3s]" />
                      </span>
                    ) : (
                      <div className="prose prose-sm max-w-none prose-headings:font-semibold prose-headings:text-gray-900 prose-p:text-gray-700 prose-p:leading-relaxed prose-li:text-gray-700 prose-strong:text-gray-900 prose-table:text-xs prose-th:bg-gray-50 prose-th:font-semibold prose-th:text-gray-700 prose-td:text-gray-700 prose-td:align-top prose-a:text-blue-600">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mx-auto w-full max-w-2xl px-4 pb-2 sm:px-6">
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Input bar */}
      <div className="border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
        <form onSubmit={handleSubmit} className="mx-auto flex max-w-2xl items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe a case or ask a clinical question… (Enter to send)"
            rows={1}
            disabled={loading}
            className="flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-40"
            aria-label="Send"
          >
            {loading ? (
              <svg className="size-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
                <path d="M3.105 2.288a.75.75 0 0 0-.826.95l1.414 4.926A1.5 1.5 0 0 0 5.135 9.25h6.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.086l-1.414 4.926a.75.75 0 0 0 .826.95 28.897 28.897 0 0 0 15.293-7.155.75.75 0 0 0 0-1.114A28.897 28.897 0 0 0 3.105 2.288Z" />
              </svg>
            )}
          </button>
        </form>
        <p className="mx-auto mt-1.5 max-w-2xl text-center text-xs text-gray-400">
          Praxxt Reason · AI educational tool · Always verify with qualified clinicians
        </p>
      </div>
    </div>
  );
}
