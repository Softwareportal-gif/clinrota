"use client";

import Image from "next/image";
import { useRef } from "react";

const INK = "#17153B";
const BODY = "#4A4867";
// The accent half of each name is set in a serif, for contrast with Manrope;
// system serifs only, so the homepage loads no extra font.
const SERIF = 'Georgia, "Noto Serif", "Times New Roman", serif';

// The three modules of Praxxt Logbook. Illustrations: Open Peeps by Pablo
// Stanley (CC0, no credit required), rendered once to static SVG with the
// react-peeps package (MIT), which the site itself does not depend on.
const MODULES = [
  {
    label: "Students & supervisors",
    lead: "Clinical",
    accentWord: "Logbook",
    body: "Structured SOAP case entries mapped to your competency framework, with entrustment levels rated by supervisors.",
    background: "#FDE8F0",
    accent: "#D9246B",
    image: { src: "/images/illustrations/logbook.svg", alt: "A student logging a clinical case on her phone", width: 792, height: 1277 },
  },
  {
    label: "Coordinators & clinical sites",
    lead: "Rotations &",
    accentWord: "Placements",
    body: "Assign rotations, collect student site preferences, and track supervised hours at every clinical site.",
    background: "#ECEAFE",
    accent: "#5A3BF0",
    image: { src: "/images/illustrations/placements.svg", alt: "A clinical supervisor in scrubs with a stethoscope", width: 955, height: 1260 },
  },
  {
    label: "Coordinators & students",
    lead: "Compliance &",
    accentWord: "Records",
    body: "Verify required documents before placements start, and give every student a supervisor-verified CV.",
    background: "#DDF4F4",
    accent: "#0B7F8F",
    image: { src: "/images/illustrations/compliance.svg", alt: "A clinician in a white coat", width: 955, height: 1260 },
  },
];

function Arrow({ direction, onClick }: { direction: "previous" | "next"; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direction === "previous" ? "Previous module" : "Next module"}
      className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border bg-white transition hover:border-[#5A3BF0] hover:text-[#5A3BF0] active:scale-95"
      style={{ borderColor: "#DCD8F5" }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={direction === "previous" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
      </svg>
    </button>
  );
}

// Large module cards in a row that scrolls sideways: swipe on a phone, or use
// the arrows. Cards snap into place, lined up with the page column.
export function ModulesShowcase() {
  const scroller = useRef<HTMLDivElement>(null);

  function scroll(direction: 1 | -1) {
    const el = scroller.current;
    const card = el?.querySelector("article");
    if (!el || !card) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: direction * (card.getBoundingClientRect().width + 24), behavior: reduce ? "auto" : "smooth" });
  }

  // Lines the first card up with the page's max-w-6xl column (72rem, 1.5rem gutter).
  const inset = "max(1.5rem, calc((100% - 72rem) / 2 + 1.5rem))";

  return (
    <div className="mt-10">
      <div className="mx-auto mb-6 flex max-w-6xl justify-end gap-3 px-6">
        <Arrow direction="previous" onClick={() => scroll(-1)} />
        <Arrow direction="next" onClick={() => scroll(1)} />
      </div>
      <div
        ref={scroller}
        className="flex snap-x snap-mandatory gap-6 overflow-x-auto pb-10 pt-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ paddingInline: inset, scrollPaddingInline: inset }}
        aria-label="Praxxt Logbook modules"
      >
        {MODULES.map((m) => (
          <article
            key={m.accentWord}
            className="group relative flex min-h-[600px] w-[86vw] max-w-[640px] shrink-0 snap-start flex-col overflow-hidden rounded-[32px] px-8 pt-8 transition duration-300 hover:shadow-[0_24px_48px_rgba(37,32,110,.16)] motion-safe:hover:-translate-y-1.5 sm:min-h-[680px] sm:w-[560px] sm:px-12 sm:pt-12 lg:w-[640px]"
            style={{ backgroundColor: m.background, color: INK }}
          >
            <p className="text-sm font-bold uppercase tracking-[0.08em]" style={{ color: BODY }}>
              {m.label}
            </p>
            <h3 className="mt-4 text-[40px] font-extrabold leading-[1.02] tracking-[-0.03em] sm:text-[52px]">
              {m.lead}{" "}
              <span className="font-bold" style={{ fontFamily: SERIF, color: m.accent, letterSpacing: "-0.02em" }}>
                {m.accentWord}
              </span>
            </h3>
            <p className="relative z-10 mt-6 max-w-[290px] text-lg leading-relaxed">{m.body}</p>
            <div className="relative z-10 mt-8">
              <a
                href="#contact"
                className="inline-block rounded-full border-2 bg-white/70 px-7 py-3 text-base font-bold transition hover:bg-white"
                style={{ borderColor: m.accent }}
              >
                See it in a demo
              </a>
            </div>
            <div className="mt-auto flex justify-end pt-6 sm:absolute sm:bottom-0 sm:right-8 sm:pt-0">
              <Image
                src={m.image.src}
                alt={m.image.alt}
                width={m.image.width}
                height={m.image.height}
                className="h-[300px] w-auto origin-bottom transition-transform duration-500 ease-out motion-safe:group-hover:scale-[1.05] sm:h-[400px]"
              />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
