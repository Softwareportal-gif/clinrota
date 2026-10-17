"use client";

import { useMemo } from "react";
import { X } from "lucide-react";
import { DEPTH_LEVELS, SYSTEMS, type AnatomySystem, type Catalogue, type DepthLevel } from "@/lib/anatomy/catalogue";
import { ACCENT, BORDER, INK, TEXT_SECONDARY } from "@/app/student/dashboard-sections/colors";
import { SYSTEM_COLOURS, depthLabel, systemLabel } from "./system-labels";

// Systems & layers: a bottom sheet on phones, a left panel on laptops.
export function SystemsDrawer({
  catalogue,
  systems,
  depth,
  onToggleSystem,
  onDepthChange,
  onClose,
}: {
  catalogue: Catalogue;
  systems: AnatomySystem[];
  depth: DepthLevel;
  onToggleSystem: (system: AnatomySystem) => void;
  onDepthChange: (depth: DepthLevel) => void;
  onClose: () => void;
}) {
  const counts = useMemo(() => {
    const c = new Map<AnatomySystem, number>();
    for (const s of catalogue.structures) c.set(s.system, (c.get(s.system) ?? 0) + 1);
    return c;
  }, [catalogue]);
  const depthIndex = DEPTH_LEVELS.indexOf(depth);

  return (
    <div
      role="dialog"
      aria-label="Systems and layers"
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      className="pointer-events-auto absolute inset-x-0 bottom-0 z-30 flex max-h-[70vh] flex-col rounded-t-2xl bg-white shadow-2xl sm:inset-y-0 sm:left-0 sm:right-auto sm:max-h-none sm:w-80 sm:rounded-none sm:rounded-r-2xl"
      style={{ border: `1px solid ${BORDER}` }}
    >
      <div className="flex items-center justify-between px-5 pb-2 pt-4">
        <h2 className="text-base font-bold" style={{ color: INK }}>
          Systems &amp; layers
        </h2>
        <button
          type="button"
          aria-label="Close systems and layers"
          onClick={onClose}
          className="cursor-pointer rounded-full p-1"
        >
          <X size={18} aria-hidden style={{ color: TEXT_SECONDARY }} />
        </button>
      </div>

      <div className="overflow-y-auto px-5 pb-5">
        <label htmlFor="anatomy-depth" className="mt-2 block text-sm font-semibold" style={{ color: INK }}>
          Depth
        </label>
        <input
          id="anatomy-depth"
          type="range"
          min={0}
          max={DEPTH_LEVELS.length - 1}
          step={1}
          value={depthIndex}
          aria-valuetext={depthLabel(depth)}
          onChange={(e) => onDepthChange(DEPTH_LEVELS[Number(e.target.value)])}
          className="mt-2 w-full cursor-pointer"
          style={{ accentColor: ACCENT }}
        />
        <ol aria-label="Depth levels" className="mt-1 flex justify-between text-xs" style={{ color: TEXT_SECONDARY }}>
          {DEPTH_LEVELS.map((level, i) => (
            <li key={level} style={{ color: i === depthIndex ? ACCENT : undefined, fontWeight: i === depthIndex ? 600 : 400 }}>
              {depthLabel(level)}
            </li>
          ))}
        </ol>

        <h3 className="mt-5 text-sm font-semibold" style={{ color: INK }}>
          Systems
        </h3>
        <ul className="mt-2 space-y-1">
          {SYSTEMS.map((system) => {
            const on = systems.includes(system);
            const count = counts.get(system) ?? 0;
            return (
              <li key={system}>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  aria-label={`${systemLabel(system)}, ${count} ${count === 1 ? "structure" : "structures"}`}
                  onClick={() => onToggleSystem(system)}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-2 py-2 text-left text-sm"
                  style={{ color: INK }}
                >
                  <span aria-hidden className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: SYSTEM_COLOURS[system] }} />
                  <span className="flex-1">{systemLabel(system)}</span>
                  <span className="text-xs" style={{ color: TEXT_SECONDARY }}>
                    {count}
                  </span>
                  <span
                    aria-hidden
                    className="relative h-5 w-9 shrink-0 rounded-full transition-colors"
                    style={{ backgroundColor: on ? ACCENT : BORDER }}
                  >
                    <span
                      className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all"
                      style={{ left: on ? "1.125rem" : "0.125rem" }}
                    />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
