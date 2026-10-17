import { BackLink } from "./back-link";
import { LogoutButton } from "./logout-button";
import { SyncStatusIndicator } from "./sync-status-indicator";

// Top bar of a coordinator, supervisor or super admin page, inside the
// PortalShell (which carries the logo, navigation and who's signed in).
// Pages below a portal's top level pass `back` for a way up a level.
export function DashboardHeader({
  title,
  userId,
  back,
}: {
  title: string;
  // Only student/supervisor pages pass this — those are the roles with
  // offline-capable writes. Coordinator/admin pages stay online-only and
  // simply don't render the sync indicator by omitting it.
  userId?: string;
  back?: { href: string; label: string };
}) {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-gray-200 bg-white/95 px-4 py-3.5 backdrop-blur sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        {back && <BackLink href={back.href} label={back.label} />}
        <h1 className="truncate text-lg font-bold text-gray-900">{title}</h1>
      </div>
      <div className="flex shrink-0 items-center gap-4">
        {userId && <SyncStatusIndicator userId={userId} />}
        <LogoutButton />
      </div>
    </header>
  );
}
