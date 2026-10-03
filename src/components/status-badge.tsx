import type { LogEntryStatus } from "@/generated/prisma/client";
import { STATUS_LABELS, STATUS_BADGE_CLASSES } from "@/lib/log-entry-constants";

export function StatusBadge({ status }: { status: LogEntryStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASSES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
