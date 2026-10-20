import { requireRole } from "@/lib/require-role";
import { getStudentProfileByUserId } from "@/lib/student";
import { totalUnreadMessages } from "@/lib/messaging";
import { SyncStatusIndicator } from "@/components/sync-status-indicator";
import { LogoutButton } from "@/components/logout-button";
import { PortalShell, type PortalNavItem } from "@/components/portal-shell/portal-shell";
import type { Metadata } from "next";

export const metadata: Metadata = { title: { template: "%s · Praxxt", default: "Praxxt" } };

const NAV_ITEMS: PortalNavItem[] = [
  { href: "/student", label: "Dashboard", icon: "grid", exact: true },
  { href: "/student/profile", label: "My Profile", icon: "user" },
  { href: "/student/preferences", label: "Rotation Preferences", icon: "star" },
  { href: "/student/placements", label: "My Placements", icon: "pin" },
  { href: "/student/compliance", label: "Required Documents", icon: "file" },
  { href: "/student/log/new", label: "Log a case", icon: "clipboard" },
  { href: "/student/logbook", label: "My Logbook", icon: "list" },
  { href: "/student/timesheets", label: "Timesheets", icon: "clock" },
  { href: "/student/messages", label: "Messages", icon: "messages" },
];

// Same frame as the other portals (PortalShell), so on a phone the menu
// becomes a scrolling strip instead of a sidebar that crowds out the page.
export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("STUDENT");
  const [studentProfile, unreadMessages] = await Promise.all([
    getStudentProfileByUserId(session.user.id),
    totalUnreadMessages(session.user.id),
  ]);
  const subLabel = studentProfile.cohort
    ? `${studentProfile.cohort.name} · ${studentProfile.cohort.academicYear}`
    : studentProfile.program.name;
  const items = NAV_ITEMS.map((item) =>
    item.href === "/student/messages" ? { ...item, badge: unreadMessages } : item
  );

  return (
    <PortalShell portalLabel="Student portal" items={items} userName={session.user.name ?? ""} subLabel={subLabel}>
      <main className="flex min-w-0 flex-col gap-6 px-4 pb-14 pt-6 sm:px-8 sm:pt-9 lg:px-11">
        <div className="flex items-center justify-end gap-4">
          <SyncStatusIndicator userId={session.user.id} />
          <LogoutButton />
        </div>
        {children}
      </main>
    </PortalShell>
  );
}
