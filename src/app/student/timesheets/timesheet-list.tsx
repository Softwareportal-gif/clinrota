"use client";

import { usePendingWrites } from "@/lib/offline/use-pending-writes";
import { PendingSyncBadge } from "@/components/pending-sync-badge";
import type { SubmitTimesheetPayload } from "@/lib/offline/payloads";

type ServerEntry = {
  id: string;
  shiftDate: Date;
  hours: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
};

type Row = {
  id: string;
  shiftDate: Date;
  hours: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  pendingSync: boolean;
};

export function TimesheetList({
  serverEntries,
  userId,
}: {
  serverEntries: ServerEntry[];
  userId: string;
}) {
  const pending = usePendingWrites(userId, ["submit-timesheet"]);
  const pendingIds = new Set(pending.map((p) => p.id));
  const serverIds = new Set(serverEntries.map((e) => e.id));

  const localOnly: Row[] = pending
    .filter((p) => !serverIds.has(p.id))
    .map((p) => {
      const payload = p.payload as unknown as SubmitTimesheetPayload;
      return {
        id: p.id,
        shiftDate: new Date(payload.shiftDate),
        hours: payload.hours,
        status: "PENDING",
        pendingSync: true,
      };
    });

  const rows: Row[] = [
    ...localOnly,
    ...serverEntries.map((e) => ({ ...e, pendingSync: pendingIds.has(e.id) })),
  ].sort((a, b) => b.shiftDate.getTime() - a.shiftDate.getTime());

  if (rows.length === 0) {
    return <p className="text-sm text-gray-500">No timesheet entries yet.</p>;
  }

  return (
    <ul className="divide-y divide-gray-200 rounded-md border border-gray-200 bg-white">
      {rows.map((entry) => (
        <li key={entry.id} className="flex items-center justify-between gap-4 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-gray-900">
              {entry.shiftDate.toLocaleDateString()} · {entry.hours.toFixed(1)}h
            </p>
            <p className="text-xs text-gray-500">{entry.status}</p>
          </div>
          {entry.pendingSync && <PendingSyncBadge />}
        </li>
      ))}
    </ul>
  );
}
