"use client";

import Link from "next/link";
import { usePendingWrites } from "@/lib/offline/use-pending-writes";
import { PendingSyncBadge } from "@/components/pending-sync-badge";
import { StatusBadge } from "@/components/status-badge";
import type { LogEntryStatus } from "@/generated/prisma/client";
import type { CreateLogEntryPayload, SaveLogStepPayload } from "@/lib/offline/payloads";

type ServerEntry = {
  id: string;
  caseTitle: string;
  status: LogEntryStatus;
  occurredAt: Date;
  clinicalSiteName: string;
};

type Row = ServerEntry & { pendingSync: boolean; localOnly: boolean };

export function LogbookList({
  serverEntries,
  userId,
}: {
  serverEntries: ServerEntry[];
  userId: string;
}) {
  const pending = usePendingWrites(userId, ["create-log-entry", "save-log-step"]);
  const serverIds = new Set(serverEntries.map((e) => e.id));

  // Reconstruct a display row for any log entry that only exists locally
  // (created and/or edited entirely offline, never yet reaching the server).
  const localById = new Map<string, Row>();
  for (const write of pending) {
    if (write.opType === "create-log-entry") {
      const payload = write.payload as unknown as CreateLogEntryPayload;
      if (serverIds.has(payload.id)) continue;
      const existing = localById.get(payload.id);
      localById.set(payload.id, {
        id: payload.id,
        caseTitle: payload.caseTitle,
        status: existing?.status ?? "DRAFT",
        occurredAt: new Date(payload.occurredAt),
        clinicalSiteName: "(syncing…)",
        pendingSync: true,
        localOnly: true,
      });
    } else if (write.opType === "save-log-step") {
      const payload = write.payload as unknown as SaveLogStepPayload;
      if (serverIds.has(payload.logEntryId)) continue;
      const existing = localById.get(payload.logEntryId);
      if (!existing) continue; // its create hasn't been processed yet in this pass
      if (payload.step === "plan" && payload.intent === "submit") {
        existing.status = "SUBMITTED";
      }
    }
  }

  const pendingLogEntryIds = new Set<string>();
  for (const write of pending) {
    if (write.opType === "create-log-entry") {
      pendingLogEntryIds.add((write.payload as unknown as CreateLogEntryPayload).id);
    } else if (write.opType === "save-log-step") {
      pendingLogEntryIds.add((write.payload as unknown as SaveLogStepPayload).logEntryId);
    }
  }

  const rows: Row[] = [
    ...localById.values(),
    ...serverEntries.map((e) => ({
      ...e,
      pendingSync: pendingLogEntryIds.has(e.id),
      localOnly: false,
    })),
  ].sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());

  if (rows.length === 0) {
    return <p className="text-sm text-gray-500">No cases logged yet.</p>;
  }

  return (
    <ul className="divide-y divide-gray-200 rounded-md border border-gray-200 bg-white">
      {rows.map((entry) => (
        <li key={entry.id}>
          <Link
            href={entry.localOnly ? `/student/log/${entry.id}/edit` : `/student/log/${entry.id}`}
            className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-gray-50"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-900">{entry.caseTitle}</p>
              <p className="text-xs text-gray-500">
                {entry.clinicalSiteName} · {entry.occurredAt.toLocaleDateString()}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {entry.pendingSync && <PendingSyncBadge />}
              <StatusBadge status={entry.status} />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
