"use client";

import { X } from "lucide-react";
import type { Structure } from "@/lib/anatomy/catalogue";
import { BORDER, INK, TEXT_SECONDARY } from "@/app/student/dashboard-sections/colors";
import { SYSTEM_COLOURS, systemLabel } from "./system-labels";

// The pop-up card for the selected structure. The fuller study panel
// ("Read more") arrives with the content work in a later step.
export function StructureCard({ structure, onClose }: { structure: Structure; onClose: () => void }) {
  return (
    <section
      aria-label="Selected structure"
      className="pointer-events-auto rounded-2xl bg-white p-4 shadow-lg"
      style={{ border: `1px solid ${BORDER}` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-base font-bold" style={{ color: INK }}>
            {structure.name}
          </h2>
          {structure.latin && (
            <p className="truncate text-sm italic" style={{ color: TEXT_SECONDARY }}>
              {structure.latin}
            </p>
          )}
        </div>
        <button
          type="button"
          aria-label="Close card"
          onClick={onClose}
          className="-m-1 shrink-0 cursor-pointer rounded-full p-1"
        >
          <X size={18} aria-hidden style={{ color: TEXT_SECONDARY }} />
        </button>
      </div>
      <span
        className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium"
        style={{ color: TEXT_SECONDARY }}
      >
        <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SYSTEM_COLOURS[structure.system] }} />
        <span>{systemLabel(structure.system)}</span>
      </span>
    </section>
  );
}
