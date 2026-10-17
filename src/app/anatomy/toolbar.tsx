"use client";

import { Eye, EyeOff, Focus, Layers, RotateCcw, type LucideIcon } from "lucide-react";
import { ACCENT, BORDER, INK } from "@/app/student/dashboard-sections/colors";

type Tool = { label: string; icon: LucideIcon; onClick: () => void; disabled?: boolean; pressed?: boolean };

// The small toolbar along the bottom. Cut and Save view come in later steps.
export function Toolbar({
  hasSelection,
  hasHiddenOrIsolated,
  drawerOpen,
  onLayers,
  onHide,
  onIsolate,
  onShowAll,
  onReset,
}: {
  hasSelection: boolean;
  hasHiddenOrIsolated: boolean;
  drawerOpen: boolean;
  onLayers: () => void;
  onHide: () => void;
  onIsolate: () => void;
  onShowAll: () => void;
  onReset: () => void;
}) {
  const tools: Tool[] = [
    { label: "Layers", icon: Layers, onClick: onLayers, pressed: drawerOpen },
    { label: "Hide", icon: EyeOff, onClick: onHide, disabled: !hasSelection },
    { label: "Isolate", icon: Focus, onClick: onIsolate, disabled: !hasSelection },
    { label: "Show all", icon: Eye, onClick: onShowAll, disabled: !hasHiddenOrIsolated },
    { label: "Reset view", icon: RotateCcw, onClick: onReset },
  ];
  return (
    <div
      role="toolbar"
      aria-label="Explorer tools"
      className="pointer-events-auto flex w-full max-w-md items-stretch gap-0.5 rounded-2xl bg-white p-1 shadow-lg"
      style={{ border: `1px solid ${BORDER}` }}
    >
      {tools.map(({ label, icon: Icon, onClick, disabled, pressed }) => (
        <button
          key={label}
          type="button"
          onClick={onClick}
          disabled={disabled}
          aria-pressed={pressed}
          className="flex min-w-0 flex-1 cursor-pointer flex-col items-center gap-0.5 whitespace-nowrap rounded-xl px-1 py-1.5 text-[11px] font-medium disabled:cursor-default disabled:opacity-40"
          style={{ color: pressed ? ACCENT : INK, backgroundColor: pressed ? "#F1EEFF" : undefined }}
        >
          <Icon size={18} aria-hidden />
          {label}
        </button>
      ))}
    </div>
  );
}
