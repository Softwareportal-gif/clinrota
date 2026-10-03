import { offlineDb, type PendingOpType } from "./db";

const TIMEOUT_MS = 10_000;

function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Request timed out")), TIMEOUT_MS);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      }
    );
  });
}

export type SubmitOutcome<T> = { synced: true; result: T } | { synced: false };

// Tries the real server action first. Only a genuine network failure
// (offline, timeout, connection reset) falls back to the local queue —
// a server-returned validation error (e.g. `{ error: "..." }`) is a normal
// resolved value, not a throw, so it's passed straight back to the caller
// rather than queued (retrying later wouldn't fix a validation problem).
export async function submitWithFallback<T>(params: {
  id: string;
  userId: string;
  opType: PendingOpType;
  payload: Record<string, unknown>;
  action: () => Promise<T>;
}): Promise<SubmitOutcome<T>> {
  const { id, userId, opType, payload, action } = params;

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    await offlineDb.pendingWrites.put({ id, userId, opType, payload, createdAt: Date.now(), status: "pending" });
    return { synced: false };
  }

  try {
    const result = await withTimeout(action());
    return { synced: true, result };
  } catch {
    await offlineDb.pendingWrites.put({
      id,
      userId,
      opType,
      payload,
      createdAt: Date.now(),
      status: "pending",
    });
    return { synced: false };
  }
}
