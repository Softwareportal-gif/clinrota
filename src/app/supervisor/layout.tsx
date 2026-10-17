import { requireRole } from "@/lib/require-role";
import { getSupervisorProfileByUserId } from "@/lib/supervisor";
import { prisma } from "@/lib/prisma";
import { PortalShell, type PortalNavItem } from "@/components/portal-shell/portal-shell";

export default async function SupervisorLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("SUPERVISOR");
  const supervisorProfile = await getSupervisorProfileByUserId(session.user.id);
  // Ward review only exists for supervisors cleared for ward supervision
  // at some site — the same check the dashboard uses for its button.
  const isWardEligible = await prisma.wardSupervisorEligibility.findFirst({
    where: { supervisorProfileId: supervisorProfile.id },
  });

  const items: PortalNavItem[] = [
    { href: "/supervisor", label: "Pending review", icon: "inbox", exact: true },
    ...(isWardEligible ? [{ href: "/supervisor/ward-review", label: "Ward review", icon: "clipboard" } as const] : []),
    { href: "/supervisor/timesheets", label: "Timesheets", icon: "clock" },
    { href: "/help", label: "Help", icon: "help" },
  ];

  return (
    <PortalShell
      portalLabel="Supervisor portal"
      items={items}
      userName={session.user.name ?? ""}
      subLabel={supervisorProfile.professionalTitle ?? undefined}
    >
      {children}
    </PortalShell>
  );
}
