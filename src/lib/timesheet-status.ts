import type { TimesheetStatus } from "@/generated/prisma/client";

// Plain words for a timesheet's state, wherever it's shown.
export const TIMESHEET_STATUS_LABELS: Record<TimesheetStatus, string> = {
  PENDING: "Awaiting approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const TIMESHEET_STATUS_CLASSES: Record<TimesheetStatus, string> = {
  PENDING: "bg-amber-50 text-amber-800",
  APPROVED: "bg-green-50 text-green-700",
  REJECTED: "bg-red-50 text-red-700",
};
