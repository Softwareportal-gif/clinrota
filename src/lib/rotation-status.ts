import type { Prisma, RotationStatus } from "@/generated/prisma/client";

// A rotation's real state comes from its dates: upcoming before it starts,
// active while it runs (through the whole end date), completed after. The
// stored status only overrides that when a coordinator cancels a rotation
// or ends it early (CANCELLED / COMPLETED); SCHEDULED and ACTIVE are just
// the dates' answer at the time it was written.

type Dated = { status: RotationStatus; startDate: Date; endDate: Date };

// Students may still log cases and hours for a few days after a rotation
// ends, to catch up on the last shifts.
export const LOGGING_GRACE_DAYS = 7;
const DAY = 24 * 60 * 60 * 1000;

const startOfDay = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
const endOfDay = (d: Date) => startOfDay(d) + DAY - 1;

export function rotationPhase(r: Dated, now: Date = new Date()): RotationStatus {
  if (r.status === "CANCELLED" || r.status === "COMPLETED") return r.status;
  const t = now.getTime();
  if (t < startOfDay(r.startDate)) return "SCHEDULED";
  if (t > endOfDay(r.endDate)) return "COMPLETED";
  return "ACTIVE";
}

const LABELS: Record<RotationStatus, string> = {
  SCHEDULED: "Upcoming",
  ACTIVE: "Active",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export function rotationPhaseLabel(phase: RotationStatus): string {
  return LABELS[phase];
}

// Whether a student can log a case or hours against this rotation now.
export function canLogAgainst(r: Dated, now: Date = new Date()): boolean {
  if (r.status === "CANCELLED") return false;
  const t = now.getTime();
  return t >= startOfDay(r.startDate) && t <= endOfDay(r.endDate) + LOGGING_GRACE_DAYS * DAY;
}

// The same rule as a database filter, for listing the rotations a student
// can log against.
export function loggableRotationWhere(now: Date = new Date()): Prisma.RotationWhereInput {
  const today = new Date(startOfDay(now));
  return {
    status: { not: "CANCELLED" },
    startDate: { lte: new Date(endOfDay(now)) },
    endDate: { gte: new Date(today.getTime() - LOGGING_GRACE_DAYS * DAY) },
  };
}

// Rotations that are running today (not cancelled or ended early).
export function currentRotationWhere(now: Date = new Date()): Prisma.RotationWhereInput {
  return {
    status: { in: ["SCHEDULED", "ACTIVE"] },
    startDate: { lte: new Date(endOfDay(now)) },
    endDate: { gte: new Date(startOfDay(now)) },
  };
}

export function statusForNewRotation(startDate: Date, now: Date = new Date()): RotationStatus {
  return now.getTime() < startOfDay(startDate) ? "SCHEDULED" : "ACTIVE";
}
