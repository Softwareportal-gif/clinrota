"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { offlineDb, type PendingOpType, type PendingWrite } from "./db";

// Live (auto-updating) view of not-yet-synced queue items for this user,
// optionally scoped to specific operation types.
export function usePendingWrites(userId: string | undefined, opTypes?: PendingOpType[]): PendingWrite[] {
  const key = opTypes?.join(",") ?? "";
  const rows = useLiveQuery(async () => {
    if (!userId) return [];
    return offlineDb.pendingWrites
      .where("userId")
      .equals(userId)
      .and((w) => w.status !== "synced" && (!opTypes || opTypes.includes(w.opType)))
      .sortBy("createdAt");
  }, [userId, key]);
  return rows ?? [];
}
