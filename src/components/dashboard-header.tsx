import Link from "next/link";
import { LogoutButton } from "./logout-button";
import { SyncStatusIndicator } from "./sync-status-indicator";
import { Wordmark } from "./wordmark";

// "Dr. Kofi Mensah" → "K", not "D".
function initialOf(name: string) {
  const firstName = name.trim().replace(/^(dr|mr|mrs|ms|miss|prof)\.?\s+/i, "");
  return firstName.charAt(0).toUpperCase() || "?";
}

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
    <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white/95 px-6 py-3.5 backdrop-blur">
      <div className="flex min-w-0 items-center gap-4">
        <Link href="/" aria-label="Praxxt home" className="shrink-0 transition hover:opacity-80">
          <Wordmark size={22} />
        </Link>
        <span className="h-6 w-px shrink-0 bg-gray-200" aria-hidden="true" />
        <h1 className="truncate text-lg font-bold text-gray-900">{title}</h1>
      </div>
      <div className="flex items-center gap-4">
        {userId && <SyncStatusIndicator userId={userId} />}
        <span className="flex items-center gap-2 text-sm font-medium text-gray-600">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ background: "linear-gradient(135deg, #5A3BF0, #2563EB)" }}
            aria-hidden="true"
          >
            {initialOf(userName)}
          </span>
          {userName}
        </span>
        <LogoutButton />
      </div>
    </header>
  );
}
