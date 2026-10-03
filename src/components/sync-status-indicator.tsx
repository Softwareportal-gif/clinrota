"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useOnlineStatus } from "@/lib/offline/use-online-status";
import { usePendingWrites } from "@/lib/offline/use-pending-writes";
import { syncPendingWrites } from "@/lib/offline/sync";

export function SyncStatusIndicator({ userId }: { userId: string }) {
  const router = useRouter();
  const online = useOnlineStatus();
  const pending = usePendingWrites(userId);
  const pendingCount = pending.length;
  const [isSyncing, setIsSyncing] = useState(false);
  const [offlineNotice, setOfflineNotice] = useState(false);
  const hasAutoSyncedForThisOnlineSpell = useRef(false);

  const runSync = async () => {
    setIsSyncing(true);
    try {
      const result = await syncPendingWrites(userId);
      // The server actions we just replayed call revalidatePath, but that
      // only affects *future* navigations/reloads of that path — it does
      // not push fresh data into this already-mounted page. Without this,
      // a page that finished server-rendering before the sync landed keeps
      // showing stale (or missing) server data even though the write
      // succeeded moments later.
      if (result.succeeded > 0) {
        router.refresh();
      }
      // Best-effort Background Sync registration — a nice-to-have layered
      // on top of the online-event + manual-button mechanism above, not a
      // replacement (support is inconsistent, notably on iOS Safari).
      // Deliberately `getRegistration()`, not `.ready` — `.ready` never
      // resolves at all when no service worker is registered for this
      // scope (e.g. always true in dev, where Serwist is disabled), which
      // would hang this function — and with it, `isSyncing` — forever.
      if ("serviceWorker" in navigator) {
        try {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg && "sync" in reg) {
            await (reg as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }).sync.register(
              "clinrota-pending-writes"
            );
          }
        } catch {
          // Background Sync unsupported/unavailable — fine, the online
          // event and manual button already cover it.
        }
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // Auto-sync the moment connectivity returns, without the user touching
  // anything. Also try once on mount in case there's a backlog from a
  // previous offline session.
  useEffect(() => {
    if (online) {
      setOfflineNotice(false);
      if (!hasAutoSyncedForThisOnlineSpell.current) {
        hasAutoSyncedForThisOnlineSpell.current = true;
        void runSync();
      }
    } else {
      hasAutoSyncedForThisOnlineSpell.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  if (pendingCount === 0 && online) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
        All synced
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-flex items-center gap-1.5 text-xs font-medium ${
          online ? "text-amber-700" : "text-gray-500"
        }`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${online ? "bg-amber-500" : "bg-gray-400"}`} />
        {!online
          ? `Offline${pendingCount > 0 ? ` · ${pendingCount} pending` : ""}`
          : `${pendingCount} pending sync`}
      </span>
      {pendingCount > 0 && (
        <button
          type="button"
          onClick={async () => {
            if (!online) {
              setOfflineNotice(true);
              return;
            }
            setOfflineNotice(false);
            await runSync();
          }}
          disabled={isSyncing}
          className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 disabled:opacity-50"
        >
          {isSyncing ? "Syncing..." : "Sync now"}
        </button>
      )}
      {offlineNotice && (
        <span className="text-xs text-gray-500">
          Still offline — will sync automatically once you&apos;re back online.
        </span>
      )}
    </div>
  );
}
