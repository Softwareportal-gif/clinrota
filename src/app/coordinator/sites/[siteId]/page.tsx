import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole } from "@/lib/require-role";
import { getCoordinatorProfileByUserId } from "@/lib/coordinator";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "@/components/dashboard-header";
import { Badge } from "@/components/badge";
import { getSiteContractStatus, SITE_STATUS_LABELS, SITE_STATUS_BADGE_CLASSES } from "@/lib/site-status";
import { SiteForm } from "../site-form";
import { WardSupervisionSection } from "../ward-supervision-section";

export default async function EditSitePage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const session = await requireRole("COORDINATOR");
  const coordinatorProfile = await getCoordinatorProfileByUserId(session.user.id);

  const site = await prisma.clinicalSite.findUnique({ where: { id: siteId } });
  if (!site || site.institutionId !== coordinatorProfile.program.institutionId) notFound();

  const status = getSiteContractStatus(site);

  const [eligibilities, allSupervisors] = await Promise.all([
    prisma.wardSupervisorEligibility.findMany({
      where: { clinicalSiteId: siteId },
      include: { supervisorProfile: { include: { user: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.supervisorProfile.findMany({
      where: { user: { institutionId: coordinatorProfile.program.institutionId } },
      include: { user: true },
      orderBy: { user: { name: "asc" } },
    }),
  ]);
  const eligibleIds = new Set(eligibilities.map((e) => e.supervisorProfileId));

  return (
    <main className="min-h-screen bg-gray-50">
      <DashboardHeader title={site.name} userName={session.user.name ?? ""} />
      <div className="mx-auto max-w-3xl space-y-6 px-6 py-8">
        <div className="flex items-center gap-3">
          <p className="text-sm text-gray-500">Contract status</p>
          <Badge label={SITE_STATUS_LABELS[status]} className={SITE_STATUS_BADGE_CLASSES[status]} />
        </div>
        <SiteForm site={site} siteId={site.id} />

        <WardSupervisionSection
          siteId={site.id}
          initialEnabled={site.wardSupervisionEnabled}
          eligibleSupervisors={eligibilities.map((e) => ({
            eligibilityId: e.id,
            supervisorProfileId: e.supervisorProfileId,
            name: e.supervisorProfile.user.name,
            email: e.supervisorProfile.user.email,
          }))}
          selectableSupervisors={allSupervisors
            .filter((s) => !eligibleIds.has(s.id))
            .map((s) => ({ supervisorProfileId: s.id, name: s.user.name, email: s.user.email }))}
        />

        <div className="rounded-md border border-gray-200 bg-white p-4">
          <p className="mb-3 text-sm font-medium text-gray-700">Export placements (CSV)</p>
          <form
            action={`/coordinator/sites/${site.id}/export`}
            method="get"
            className="flex flex-wrap items-end gap-3"
          >
            <div>
              <label htmlFor="from" className="block text-xs text-gray-500">
                From
              </label>
              <input
                id="from"
                name="from"
                type="date"
                className="mt-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label htmlFor="to" className="block text-xs text-gray-500">
                To
              </label>
              <input
                id="to"
                name="to"
                type="date"
                className="mt-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
            <button
              type="submit"
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700"
            >
              Export CSV
            </button>
          </form>
          <p className="mt-2 text-xs text-gray-400">Leave both blank to export all placements on file.</p>
        </div>

        <Link href="/coordinator/sites" className="block text-sm text-gray-500 hover:underline">
          ← Back to sites
        </Link>
      </div>
    </main>
  );
}
