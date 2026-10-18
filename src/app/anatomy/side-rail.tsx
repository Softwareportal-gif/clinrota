"use client";

// View tools down the right edge: see-through skin, fascia, show everything
// again, and reset the camera.
import { Eye, Layers, RotateCcw, ScanEye, type LucideIcon } from "lucide-react";
import { ACCENT, ACCENT_SOFT, PANEL, PANEL_BORDER, TEXT, TEXT_MUTED } from "./theme";

type Tool = { label: string; icon: LucideIcon; onClick: () => void; pressed?: boolean; disabled?: boolean };

export function SideRail({
  xray,
  fascia,
  canShowAll,
  onToggleXray,
  onToggleFascia,
  onShowAll,
  onReset,
}: {
  xray: boolean;
  fascia: boolean;
  canShowAll: boolean;
  onToggleXray: () => void;
  onToggleFascia: () => void;
  onShowAll: () => void;
  onReset: () => void;
}) {
  const tools: Tool[] = [
    { label: "X-ray skin", icon: ScanEye, onClick: onToggleXray, pressed: xray },
    { label: "Fascia", icon: Layers, onClick: onToggleFascia, pressed: fascia },
    { label: "Show all", icon: Eye, onClick: onShowAll, disabled: !canShowAll },
    { label: "Reset view", icon: RotateCcw, onClick: onReset },
  ];
  return (
    <div
      role="toolbar"
      aria-label="View tools"
      aria-orientation="vertical"
      className="pointer-events-auto flex flex-col gap-1 rounded-2xl p-1.5 backdrop-blur-md"
      style={{ backgroundColor: PANEL, border: `1px solid ${PANEL_BORDER}` }}
    >
      {tools.map(({ label, icon: Icon, onClick, pressed, disabled }) => (
        <button
          key={label}
          type="button"
          onClick={onClick}
          disabled={disabled}
          aria-pressed={pressed}
          className="flex w-16 cursor-pointer flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-semibold leading-tight disabled:cursor-default disabled:opacity-35"
          style={{ backgroundColor: pressed ? ACCENT_SOFT : undefined, color: pressed ? ACCENT : disabled ? TEXT_MUTED : TEXT }}
        >
          <Icon size={18} aria-hidden />
          {label}
        </button>
      ))}
    </div>
  );
}
