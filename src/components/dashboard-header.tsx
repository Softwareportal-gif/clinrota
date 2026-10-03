import { LogoutButton } from "./logout-button";
import { SyncStatusIndicator } from "./sync-status-indicator";

export function DashboardHeader({
  title,
  userName,
  userId,
}: {
  title: string;
  userName: string;
  // Only student/supervisor pages pass this — those are the roles with
  // offline-capable writes. Coordinator/admin pages stay online-only and
  // simply don't render the sync indicator by omitting it.
  userId?: string;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-6 py-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
          ClinRota
        </p>
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
      </div>
      <div className="flex items-center gap-4">
        {userId && <SyncStatusIndicator userId={userId} />}
        <span className="text-sm text-gray-600">{userName}</span>
        <LogoutButton />
      </div>
    </header>
  );
}
