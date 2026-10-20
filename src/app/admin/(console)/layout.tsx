import { requireRole } from "@/lib/require-role";
import { PortalShell, type PortalNavItem } from "@/components/portal-shell/portal-shell";

const NAV_ITEMS: PortalNavItem[] = [
  { href: "/admin", label: "Programs", icon: "layers", exact: true },
  { href: "/admin/programs/new", label: "New program", icon: "file" },
  { href: "/admin/tickets", label: "Support tickets", icon: "ticket" },
  { href: "/admin/anatomy", label: "Anatomy plans", icon: "target" },
  { href: "/help", label: "Help", icon: "help" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("SUPER_ADMIN");
  return (
    <PortalShell portalLabel="Super admin" items={NAV_ITEMS} userName={session.user.name ?? ""} subLabel="System administrator">
      {children}
    </PortalShell>
  );
}
