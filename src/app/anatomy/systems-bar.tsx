"use client";

// The bar along the bottom: how deep the body is peeled, and one switch per
// body system showing whether it's on. Scrolls sideways on phones.
import { useMemo } from "react";
import { BicepsFlexed, Bone, Brain, Dna, Droplets, FlaskConical, Hand, HeartPulse, ShieldPlus, Utensils, Wind, type LucideIcon } from "lucide-react";
import { DEPTH_LEVELS, SYSTEMS, type AnatomySystem, type Catalogue, type DepthLevel } from "@/lib/anatomy/catalogue";
import { SYSTEM_COLOURS, depthLabel, systemLabel } from "./system-labels";
import { ACCENT, ACCENT_SOFT, PANEL, PANEL_BORDER, TEXT, TEXT_MUTED } from "./theme";

const ICONS: Record<AnatomySystem, LucideIcon> = {
  integumentary: Hand,
  muscular: BicepsFlexed,
  skeletal: Bone,
  cardiovascular: HeartPulse,
  respiratory: Wind,
  nervous: Brain,
  digestive: Utensils,
  urinary: Droplets,
  reproductive: Dna,
  lymphatic: ShieldPlus,
  endocrine: FlaskConical,
};

// Skeleton and muscles first: the systems students reach for most.
const ORDER: AnatomySystem[] = ["skeletal", "muscular", ...SYSTEMS.filter((s) => s !== "skeletal" && s !== "muscular")];

export function SystemsBar({
  catalogue,
  systems,
  depth,
  onToggleSystem,
  onDepthChange,
}: {
  catalogue: Catalogue;
  systems: AnatomySystem[];
  depth: DepthLevel;
  onToggleSystem: (system: AnatomySystem) => void;
  onDepthChange: (depth: DepthLevel) => void;
}) {
  const counts = useMemo(() => {
    const c = new Map<AnatomySystem, number>();
    for (const s of catalogue.structures) c.set(s.system, (c.get(s.system) ?? 0) + 1);
    return c;
  }, [catalogue]);

  return (
    <div
      className="pointer-events-auto flex max-w-full items-stretch gap-3 overflow-x-auto rounded-2xl px-3 py-2 backdrop-blur-md [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{ backgroundColor: PANEL, border: `1px solid ${PANEL_BORDER}` }}
    >
      <div role="radiogroup" aria-label="Depth" className="flex shrink-0 flex-col justify-center">
        <span className="px-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_MUTED }}>
          Depth
        </span>
        <div className="mt-1 flex rounded-lg p-0.5" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
          {DEPTH_LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              role="radio"
              aria-checked={depth === level}
              onClick={() => onDepthChange(level)}
              className="cursor-pointer rounded-md px-2 py-1 text-xs font-semibold"
              style={{ backgroundColor: depth === level ? ACCENT_SOFT : undefined, color: depth === level ? ACCENT : TEXT }}
            >
              {depthLabel(level)}
            </button>
          ))}
        </div>
      </div>

      <span aria-hidden className="w-px shrink-0" style={{ backgroundColor: PANEL_BORDER }} />

      <ul aria-label="Body systems" className="flex shrink-0 items-stretch gap-1">
        {ORDER.map((system) => {
          const on = systems.includes(system);
          const Icon = ICONS[system];
          const count = counts.get(system) ?? 0;
          return (
            <li key={system}>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={`${systemLabel(system)}, ${count} ${count === 1 ? "structure" : "structures"}`}
                onClick={() => onToggleSystem(system)}
                className="flex w-[84px] cursor-pointer flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[11px] font-semibold leading-tight"
                style={{ backgroundColor: on ? "rgba(255,255,255,0.08)" : undefined, color: on ? TEXT : TEXT_MUTED }}
              >
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full"
                  style={{
                    border: `1.5px solid ${on ? SYSTEM_COLOURS[system] : "rgba(255,255,255,0.18)"}`,
                    color: on ? SYSTEM_COLOURS[system] : TEXT_MUTED,
                  }}
                >
                  <Icon size={16} aria-hidden />
                </span>
                <span className="truncate">{systemLabel(system)}</span>
                <span className="text-[10px] font-medium" style={{ color: on ? ACCENT : TEXT_MUTED }}>
                  {on ? "On" : "Off"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
