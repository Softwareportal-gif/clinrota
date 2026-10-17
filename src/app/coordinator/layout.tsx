import { requireRole } from "@/lib/require-role";
import { getCoordinatorProfileByUserId } from "@/lib/coordinator";
import { PortalShell, type PortalNavItem } from "@/components/portal-shell/portal-shell";

const NAV_ITEMS: PortalNavItem[] = [
  { href: "/coordinator", label: "Dashboard", icon: "home", exact: true },
  { href: "/coordinator/students", label: "Students", icon: "users" },
  { href: "/coordinator/rotations/new", label: "Assign rotation", icon: "calendar" },
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
  const coordinatorProfile = await getCoordinatorProfileByUserId(session.user.id);
  return (
    <PortalShell
      portalLabel="Coordinator portal"
      items={NAV_ITEMS}
      userName={session.user.name ?? ""}
      subLabel={coordinatorProfile.program.name}
    >
      {children}
    </PortalShell>
  );
}
