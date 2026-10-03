import { offlineDb, type PendingWrite } from "./db";
import { createLogEntryCore } from "@/app/student/log/new/actions";
import { saveLogStepCore } from "@/app/student/log/[id]/actions";
import { submitTimesheetCore } from "@/app/student/timesheets/actions";
import { submitReviewCore } from "@/app/supervisor/review/[id]/actions";
import { createWardAssignmentCore, endWardAssignmentCore } from "@/app/student/log/new/ward-assignment-actions";
import type {
  CreateLogEntryPayload,
  SaveLogStepPayload,
  SubmitTimesheetPayload,
  SubmitReviewPayload,
  CreateWardAssignmentPayload,
  EndWardAssignmentPayload,
} from "./payloads";

const SYNCED_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

let syncInFlight: Promise<{ succeeded: number; failed: number }> | null = null;

// Replays queued writes in creation order, sequentially (never in
// parallel — concurrent writes against the local dev database exhausted
// its connection pool once before; sequential is also what preserves
// causal order, e.g. a log entry's "create" must land before its steps).
export function syncPendingWrites(userId: string): Promise<{ succeeded: number; failed: number }> {
  if (syncInFlight) return syncInFlight;

  syncInFlight = (async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return { succeeded: 0, failed: 0 };
    }

    let succeeded = 0;
    let failed = 0;

    const items = await offlineDb.pendingWrites
      .where("userId")
      .equals(userId)
      .and((w) => w.status === "pending" || w.status === "failed")
      .sortBy("createdAt");

    for (const item of items) {
      await offlineDb.pendingWrites.update(item.id, { status: "syncing" });
      try {
        await replay(item);
        await offlineDb.pendingWrites.update(item.id, { status: "synced", errorMessage: undefined });
        succeeded++;
      } catch (err) {
        await offlineDb.pendingWrites.update(item.id, {
          status: "failed",
          errorMessage: err instanceof Error ? err.message : "Sync failed.",
        });
        failed++;
      }
    }

    await offlineDb.pendingWrites
      .where("status")
      .equals("synced")
      .and((w) => Date.now() - w.createdAt > SYNCED_RETENTION_MS)
      .delete();

    return { succeeded, failed };
  })();

  return syncInFlight.finally(() => {
    syncInFlight = null;
  });
}

async function replay(item: PendingWrite) {
  switch (item.opType) {
    case "create-log-entry": {
      const result = await createLogEntryCore(item.payload as unknown as CreateLogEntryPayload);
      if (result.error) throw new Error(result.error);
      return;
    }
    case "save-log-step": {
      const result = await saveLogStepCore(item.payload as unknown as SaveLogStepPayload);
      if (result.error) throw new Error(result.error);
      return;
    }
    case "submit-timesheet": {
      const result = await submitTimesheetCore(item.payload as unknown as SubmitTimesheetPayload);
      if (result.error) throw new Error(result.error);
      return;
    }
    case "submit-review": {
      const result = await submitReviewCore(item.payload as unknown as SubmitReviewPayload);
      if (result.error) throw new Error(result.error);
      return;
    }
    case "create-ward-assignment": {
      const result = await createWardAssignmentCore(item.payload as unknown as CreateWardAssignmentPayload);
      if (result.error) throw new Error(result.error);
      return;
    }
    case "end-ward-assignment": {
      const result = await endWardAssignmentCore(item.payload as unknown as EndWardAssignmentPayload);
      if (result.error) throw new Error(result.error);
      return;
    }
  }
}
