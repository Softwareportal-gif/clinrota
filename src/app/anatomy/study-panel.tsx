"use client";

// The study panel for the selected structure: a left panel on laptops, a
// sheet rising from the bottom on phones. Overview (quick facts + summary),
// Anatomy, Function, Clinical and Credits tabs, from the structure's card.
import { useMemo, useState } from "react";
import { Eye, EyeOff, Focus, Ghost, Volume2, X } from "lucide-react";
import type { Structure } from "@/lib/anatomy/catalogue";
import type { ContentBlock, ContentSection, StructureContent } from "@/lib/anatomy/content";
import { SYSTEM_COLOURS, systemLabel } from "./system-labels";
import { ACCENT, ACCENT_SOFT, PANEL, PANEL_BORDER, TEXT, TEXT_MUTED, WARNING } from "./theme";

export type ContentState =
  | { status: "loading" }
  | { status: "ready"; content: StructureContent }
  | { status: "none" }
  | { status: "error"; retry: () => void };

type Tab = { id: string; label: string; sections: ContentSection[] };

const FUNCTION = /function|action|movement|motion/i;
const CLINICAL = /clinical|injur|disease|disorder|patholog|significance/i;

function tabsFor(content: StructureContent): Tab[] {
  const fn = content.sections.filter((s) => FUNCTION.test(s.heading));
  const clinical = content.sections.filter((s) => CLINICAL.test(s.heading));
  const anatomy = content.sections.filter((s) => !fn.includes(s) && !clinical.includes(s));
  return [
    { id: "overview", label: "Overview", sections: [] },
    { id: "anatomy", label: "Anatomy", sections: anatomy },
    { id: "function", label: "Function", sections: fn },
    { id: "clinical", label: "Clinical", sections: clinical },
    { id: "credits", label: "Credits", sections: [] },
  ].filter((t) => t.id === "overview" || t.id === "credits" || t.sections.length > 0);
}

function canSpeak() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function speak(text: string) {
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-GB";
  utterance.rate = 0.9;
  window.speechSynthesis.speak(utterance);
}

// The source gives every sentence its own paragraph; runs of them read better
// as one flowing paragraph.
function mergeParagraphs(blocks: ContentBlock[]): ContentBlock[] {
  const merged: ContentBlock[] = [];
  for (const b of blocks) {
    const last = merged[merged.length - 1];
    if (b.kind === "paragraph" && last?.kind === "paragraph") merged[merged.length - 1] = { kind: "paragraph", text: `${last.text} ${b.text}` };
    else merged.push(b);
  }
  return merged;
}

function Blocks({ blocks }: { blocks: ContentBlock[] }) {
  return (
    <>
      {mergeParagraphs(blocks).map((b, i) =>
        b.kind === "subheading" ? (
          <h4 key={i} className="mt-3 text-sm font-semibold" style={{ color: TEXT }}>
            {b.text}
          </h4>
        ) : b.kind === "list" ? (
          <ul key={i} className="mt-2 list-disc space-y-1 pl-5">
            {b.items.map((item, j) => (
              <li key={j}>{item}</li>
            ))}
          </ul>
        ) : (
          <p key={i} className="mt-2">
            {b.text}
          </p>
        )
      )}
    </>
  );
}

export function StudyPanel({
  structure,
  content,
  isolated,
  faded,
  onIsolate,
  onHide,
  onFade,
  onClose,
}: {
  structure: Structure;
  content: ContentState;
  isolated: boolean;
  faded: boolean;
  onIsolate: () => void;
  onHide: () => void;
  onFade: () => void;
  onClose: () => void;
}) {
  const ready = content.status === "ready" ? content.content : null;
  const tabs = useMemo(() => (ready ? tabsFor(ready) : []), [ready]);
  const [tabId, setTabId] = useState("overview");
  const tab = tabs.find((t) => t.id === tabId) ?? tabs[0];
  const [speakable] = useState(canSpeak);

  const actions = [
    { label: isolated ? "Isolated" : "Isolate", icon: Focus, onClick: onIsolate, pressed: isolated },
    { label: "Hide", icon: EyeOff, onClick: onHide, pressed: false },
    { label: faded ? "Unfade" : "Fade", icon: faded ? Eye : Ghost, onClick: onFade, pressed: faded },
  ];

  return (
    <section
      aria-label="Study panel"
      className="pointer-events-auto flex max-h-[55vh] flex-col overflow-hidden rounded-t-3xl backdrop-blur-md lg:h-full lg:max-h-none lg:rounded-3xl"
      style={{ backgroundColor: PANEL, border: `1px solid ${PANEL_BORDER}`, color: TEXT_MUTED }}
    >
      <div className="flex items-start gap-3 px-5 pb-3 pt-5">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-tight" style={{ color: TEXT }}>
            {structure.name}
          </h2>
          {structure.latin && <p className="mt-0.5 text-sm italic">{structure.latin}</p>}
          <div className="mt-2 flex items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SYSTEM_COLOURS[structure.system] }} />
              {systemLabel(structure.system)}
            </span>
            {speakable && (
              <button
                type="button"
                aria-label={`Say "${structure.name}"`}
                onClick={() => speak(structure.name)}
                className="inline-flex cursor-pointer items-center gap-1 rounded-full px-2 py-0.5 hover:bg-white/10"
              >
                <Volume2 size={14} aria-hidden /> Listen
              </button>
            )}
          </div>
        </div>
        <button type="button" aria-label="Close study panel" onClick={onClose} className="cursor-pointer rounded-full p-1.5 hover:bg-white/10">
          <X size={18} aria-hidden style={{ color: TEXT }} />
        </button>
      </div>

      <div className="flex gap-2 px-5 pb-3">
        {actions.map(({ label, icon: Icon, onClick, pressed }) => (
          <button
            key={label}
            type="button"
            onClick={onClick}
            aria-pressed={pressed}
            className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-semibold uppercase tracking-wide"
            style={{ backgroundColor: pressed ? ACCENT_SOFT : "rgba(255,255,255,0.06)", color: pressed ? ACCENT : TEXT }}
          >
            <Icon size={15} aria-hidden />
            {label}
          </button>
        ))}
      </div>

      {tabs.length > 0 && (
        <div role="tablist" aria-label="Study topics" className="flex gap-0.5 overflow-x-auto border-b px-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" style={{ borderColor: PANEL_BORDER }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={t.id === tab?.id}
              onClick={() => setTabId(t.id)}
              className="cursor-pointer whitespace-nowrap px-2 py-2.5 text-[13px] font-semibold"
              style={{
                color: t.id === tab?.id ? TEXT : TEXT_MUTED,
                boxShadow: t.id === tab?.id ? `inset 0 -2px 0 ${ACCENT}` : undefined,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      <div role="tabpanel" className="flex-1 overflow-y-auto px-5 pb-6 pt-4 text-[15px] leading-relaxed">
        {content.status === "loading" && <p>Loading…</p>}
        {content.status === "none" && <p>No description for this structure yet.</p>}
        {content.status === "error" && (
          <p>
            Couldn&apos;t load the description.{" "}
            <button type="button" onClick={content.retry} className="cursor-pointer font-semibold underline" style={{ color: ACCENT }}>
              Retry
            </button>
          </p>
        )}
        {ready && tab && (
          <>
            {!ready.reviewed && (
              <p className="mb-3 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ backgroundColor: "rgba(245,185,76,0.14)", color: WARNING }}>
                Not yet reviewed by Praxxt experts
              </p>
            )}
            {tab.id === "overview" && (
              <>
                {ready.facts.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: TEXT }}>
                      Quick facts{ready.factsFrom ? ` · ${ready.factsFrom}` : ""}
                    </h3>
                    <dl className="mt-2 space-y-2">
                      {ready.facts.map((f) => (
                        <div key={f.label}>
                          <dt className="text-sm font-semibold" style={{ color: TEXT }}>
                            {f.label}
                          </dt>
                          <dd>{f.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}
                {ready.summary.length > 0 && (
                  <div className={ready.facts.length > 0 ? "mt-5" : ""}>
                    <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: TEXT }}>
                      {ready.exact ? "Description" : `About ${ready.sourceTitle.toLowerCase()}`}
                    </h3>
                    <p className="mt-2">{ready.summary.join(" ")}</p>
                  </div>
                )}
              </>
            )}
            {tab.sections.map((s) => (
              <div key={s.heading} className="mb-5">
                <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: TEXT }}>
                  {s.heading}
                </h3>
                <Blocks blocks={s.blocks} />
              </div>
            ))}
            {tab.id === "credits" && (
              <div className="space-y-3 text-sm">
                <p>
                  {ready.credit.text}:{" "}
                  <a href={ready.credit.url} target="_blank" rel="noopener noreferrer" className="font-semibold underline" style={{ color: ACCENT }}>
                    {ready.sourceTitle}
                  </a>{" "}
                  ({ready.credit.licence}).
                </p>
                <p>3D model: Z-Anatomy (CC BY-SA 4.0), based on BodyParts3D, The Database Center for Life Science (CC BY-SA 2.1 Japan).</p>
                <p>{ready.reviewed ? "✓ Reviewed by Praxxt experts." : "This card has not yet been reviewed by Praxxt's clinical experts."}</p>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
