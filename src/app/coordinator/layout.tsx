import { requireRole } from "@/lib/require-role";
import { getCoordinatorProfileByUserId } from "@/lib/coordinator";
import { totalUnreadMessages } from "@/lib/messaging";
import { PortalShell, type PortalNavItem } from "@/components/portal-shell/portal-shell";
import type { Metadata } from "next";

export const metadata: Metadata = { title: { template: "%s · Praxxt", default: "Praxxt" } };

const NAV_ITEMS: PortalNavItem[] = [
  { href: "/coordinator", label: "Dashboard", icon: "home", exact: true },
  { href: "/coordinator/students", label: "Students", icon: "users" },
  { href: "/coordinator/cohorts", label: "Cohorts", icon: "layers" },
  { href: "/coordinator/messages", label: "Messages", icon: "messages" },
  { href: "/coordinator/rotations", label: "Rotations", icon: "calendar" },
  { href: "/coordinator/competencies", label: "Competencies", icon: "target" },
  { href: "/coordinator/compliance", label: "Compliance", icon: "shield" },
  { href: "/coordinator/document-types", label: "Required documents", icon: "file" },
  { href: "/coordinator/sites", label: "Clinical sites", icon: "building" },
  { href: "/coordinator/preference-cycles/new", label: "Preference cycle", icon: "list" },
  { href: "/coordinator/scoring-settings", label: "Scoring settings", icon: "sliders" },
  { href: "/help", label: "Help", icon: "help" },
];

export default async function CoordinatorLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("COORDINATOR");
  const [coordinatorProfile, unread] = await Promise.all([
    getCoordinatorProfileByUserId(session.user.id),
    totalUnreadMessages(session.user.id),
  ]);
  const items = NAV_ITEMS.map((item) => (item.href === "/coordinator/messages" ? { ...item, badge: unread } : item));
  return (
    <PortalShell
      portalLabel="Coordinator portal"
      items={items}
      userName={session.user.name ?? ""}
      subLabel={coordinatorProfile.program.name}
    >
      {children}
    </PortalShell>
  );
}
