"use client";

import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent, type ReactNode } from "react";

type Message = { role: "user" | "assistant"; content: string };

const STARTER_PROMPTS = [
  { label: "RUQ pain workup", text: "A 35-year-old woman presents with 2 days of right upper quadrant pain, nausea, and low-grade fever. Walk me through this case." },
  { label: "Acute breathlessness", text: "What is the systematic approach to a patient presenting with acute shortness of breath?" },
  { label: "Haemoptysis in a young man", text: "Help me work through the differential for a 22-year-old man with haemoptysis." },
  { label: "Chest pain approach", text: "Explain the clinical reasoning approach to a patient presenting with chest pain." },
];

// Lightweight markdown renderer (handles the patterns the AI produces)
function renderInline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const re = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[2]) parts.push(<strong key={key++} className="font-semibold text-gray-900">{m[2]}</strong>);
    else if (m[3]) parts.push(<em key={key++}>{m[3]}</em>);
    else if (m[4]) parts.push(<code key={key++} className="rounded bg-gray-100 px-1 py-0.5 font-mono text-xs text-gray-800">{m[4]}</code>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function MarkdownContent({ content }: { content: string }) {
  const lines = content.split("\n");
  const nodes: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Heading
    if (/^#{1,3} /.test(line)) {
      const level = (line.match(/^#+/) ?? [""])[0].length;
      const text = line.replace(/^#+\s*/, "");
      const cls = level === 1
        ? "mt-4 mb-1 text-base font-bold text-gray-900"
        : level === 2
        ? "mt-3 mb-1 text-sm font-semibold text-gray-800 uppercase tracking-wide"
        : "mt-2 mb-0.5 text-sm font-semibold text-gray-800";
      nodes.push(<p key={key++} className={cls}>{renderInline(text)}</p>);
      i++; continue;
    }

    // Table
    if (/^\|/.test(line)) {
      const tableLines: string[] = [];
      while (i < lines.length && /^\|/.test(lines[i])) {
        tableLines.push(lines[i]);
        i++;
      }
      const rows = tableLines
        .filter(l => !/^\|[-| :]+\|/.test(l))
        .map(l => l.replace(/^\||\|$/g, "").split("|").map(c => c.trim()));
      if (rows.length > 0) {
        nodes.push(
          <div key={key++} className="my-3 overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 text-left">
                  {rows[0].map((h, ci) => (
                    <th key={ci} className="px-3 py-2 font-semibold text-gray-700 border-b border-gray-200">{renderInline(h)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(1).map((row, ri) => (
                  <tr key={ri} className={ri % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-3 py-2 text-gray-700 align-top border-b border-gray-100">{renderInline(cell)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }

    // Bullet list
    if (/^[-*•] /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*•] /.test(lines[i])) {
        items.push(lines[i].replace(/^[-*•] /, ""));
        i++;
      }
      nodes.push(
        <ul key={key++} className="my-2 space-y-1 pl-4">
          {items.map((item, ii) => (
            <li key={ii} className="flex gap-2 text-gray-700">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-blue-500" />
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Numbered list
    if (/^\d+\. /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\. /, ""));
        i++;
      }
      nodes.push(
        <ol key={key++} className="my-2 space-y-1 pl-4">
          {items.map((item, ii) => (
            <li key={ii} className="flex gap-2 text-gray-700">
              <span className="shrink-0 font-medium text-blue-600">{ii + 1}.</span>
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      nodes.push(<hr key={key++} className="my-3 border-gray-200" />);
      i++; continue;
    }

    // Blank line
    if (line.trim() === "") {
      i++; continue;
    }

    // Paragraph
    nodes.push(
      <p key={key++} className="my-1.5 leading-relaxed text-gray-700">{renderInline(line)}</p>
    );
    i++;
  }

  return <div className="space-y-0.5 text-sm">{nodes}</div>;
}

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
      {/* Disclaimer */}
      <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-800">
        Educational use only — not for real patient care decisions. Emergency? Call 999 / 112.
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="mx-auto flex max-w-2xl flex-col items-center px-4 pt-16 pb-8 sm:px-6">
            <div className="mb-5 flex size-16 items-center justify-center rounded-2xl bg-blue-600 shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="size-8">
                <path d="M11.25 4.533A9.707 9.707 0 0 0 6 3a9.735 9.735 0 0 0-3.25.555.75.75 0 0 0-.5.707v14.25a.75.75 0 0 0 1 .707A8.237 8.237 0 0 1 6 18.75c1.995 0 3.823.707 5.25 1.886V4.533ZM12.75 20.636A8.214 8.214 0 0 1 18 18.75c.966 0 1.89.166 2.75.47a.75.75 0 0 0 1-.708V4.262a.75.75 0 0 0-.5-.707A9.735 9.735 0 0 0 18 3a9.707 9.707 0 0 0-5.25 1.533v16.103Z" />
              </svg>
            </div>
            <h1 className="mb-2 text-2xl font-bold text-gray-900">Clinical Reasoning AI</h1>
            <p className="mb-2 text-center text-sm text-gray-500 max-w-md">
              Present a case, explore a differential, or discuss evidence-based management.
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
                  <div className="min-w-0 flex-1 rounded-2xl rounded-tl-sm bg-white px-5 py-4 shadow-sm ring-1 ring-gray-200">
                    {msg.content === "" && loading && i === messages.length - 1 ? (
                      <span className="inline-flex items-center gap-1.5 text-gray-400">
                        <span className="size-1.5 rounded-full bg-current animate-bounce" />
                        <span className="size-1.5 rounded-full bg-current animate-bounce [animation-delay:0.15s]" />
                        <span className="size-1.5 rounded-full bg-current animate-bounce [animation-delay:0.3s]" />
                      </span>
                    ) : (
                      <MarkdownContent content={msg.content} />
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
