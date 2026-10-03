import type { LogEntryStatus } from "@/generated/prisma/client";

export const STATUS_LABELS: Record<LogEntryStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  NEEDS_REVISION: "Needs revision",
};

export const STATUS_BADGE_CLASSES: Record<LogEntryStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  SUBMITTED: "bg-blue-100 text-blue-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  NEEDS_REVISION: "bg-amber-100 text-amber-700",
};

// Sensible clinical ranges used to validate Objective vitals — not exhaustive
// medical bounds, just guardrails against obvious data-entry mistakes.
export const VITAL_RANGES = {
  tempC: { min: 30, max: 43, step: 0.1, label: "Temperature (°C)" },
  bpSystolic: { min: 60, max: 250, step: 1, label: "BP systolic (mmHg)" },
  bpDiastolic: { min: 30, max: 150, step: 1, label: "BP diastolic (mmHg)" },
  pulse: { min: 30, max: 220, step: 1, label: "Pulse (bpm)" },
  respRate: { min: 5, max: 60, step: 1, label: "Respiratory rate (breaths/min)" },
  spo2: { min: 50, max: 100, step: 1, label: "SpO2 (%)" },
} as const;

// Statuses a student is allowed to edit. Submitted entries are locked while
// awaiting review; approved entries are final.
export const EDITABLE_STATUSES: LogEntryStatus[] = ["DRAFT", "REJECTED", "NEEDS_REVISION"];
