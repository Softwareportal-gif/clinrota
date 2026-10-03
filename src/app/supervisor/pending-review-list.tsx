"use client";

import Link from "next/link";
import { usePendingWrites } from "@/lib/offline/use-pending-writes";
import type { SubmitReviewPayload } from "@/lib/offline/payloads";

type PendingEntry = {
  id: string;
  caseTitle: string;
  studentName: string;
  clinicalSiteName: string;
  submittedAt: Date | null;
  wardName?: string;
};

export function PendingReviewList({
  entries,
  userId,
}: {
  entries: PendingEntry[];
  userId: string;
}) {
  const queuedReviews = usePendingWrites(userId, ["submit-review"]);
  const decidedLogEntryIds = new Set(
    queuedReviews.map((w) => (w.payload as unknown as SubmitReviewPayload).logEntryId)
  );

  const visible = entries.filter((e) => !decidedLogEntryIds.has(e.id));

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">
        {visible.length} entr{visible.length === 1 ? "y" : "ies"} awaiting your review
        {queuedReviews.length > 0 && (
          <span className="text-amber-700"> · {queuedReviews.length} decided offline, syncing</span>
        )}
      </p>

      {visible.length === 0 ? (
        <p className="text-sm text-gray-500">Nothing pending right now.</p>
      ) : (
        <ul className="divide-y divide-gray-200 rounded-md border border-gray-200 bg-white">
          {visible.map((entry) => (
            <li key={entry.id}>
              <Link
                href={`/supervisor/review/${entry.id}`}
                className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-gray-50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">{entry.caseTitle}</p>
                  <p className="text-xs text-gray-500">
                    {entry.studentName} · {entry.clinicalSiteName}
                    {entry.wardName ? ` — ${entry.wardName}` : ""} · submitted{" "}
                    {entry.submittedAt ? entry.submittedAt.toLocaleDateString() : "—"}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-medium text-blue-600">Review →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
