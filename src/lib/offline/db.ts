import Dexie, { type Table } from "dexie";

// The four operations a student or supervisor might perform with no
// signal at a clinical site. Coordinator/compliance/site actions are
// intentionally excluded — those are only ever used from an office.
export type PendingOpType =
  | "create-log-entry"
  | "save-log-step"
  | "submit-timesheet"
  | "submit-review"
  | "create-ward-assignment"
  | "end-ward-assignment";

export type PendingStatus = "pending" | "syncing" | "synced" | "failed";

export interface PendingWrite {
  id: string; // client-generated UUID — the same id the server record will have
  userId: string; // scopes the queue to the signed-in user (shared-device safe)
  opType: PendingOpType;
  payload: Record<string, unknown>;
  createdAt: number;
  status: PendingStatus;
  errorMessage?: string;
}

class OfflineDatabase extends Dexie {
  pendingWrites!: Table<PendingWrite, string>;

  constructor() {
    super("clinrota-offline");
    this.version(1).stores({
      pendingWrites: "id, userId, opType, status, createdAt",
    });
  }
}

// A single shared instance — Dexie handles concurrent access across tabs.
export const offlineDb = new OfflineDatabase();
