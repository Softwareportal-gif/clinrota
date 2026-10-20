import Link from "next/link";
import { requireRole } from "@/lib/require-role";
import { getCoordinatorProfileByUserId } from "@/lib/coordinator";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "@/components/dashboard-header";
import { Badge } from "@/components/badge";
import { getSiteContractStatus, SITE_STATUS_LABELS, SITE_STATUS_BADGE_CLASSES } from "@/lib/site-status";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Clinical sites" };

export default async function SitesPage() {
  const session = await requireRole("COORDINATOR");
  const coordinatorProfile = await getCoordinatorProfileByUserId(session.user.id);

  const sites = await prisma.clinicalSite.findMany({
    where: { institutionId: coordinatorProfile.program.institutionId },
    orderBy: { name: "asc" },
  });

  return (
    <main className="min-h-screen bg-gray-50">
      <DashboardHeader title="Clinical sites" />
      <div className="mx-auto max-w-3xl space-y-6 px-6 py-8">
        <div className="flex justify-end">
          <Link
            href="/coordinator/sites/new"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white"
          >
            + Add site
          </Link>
        </div>

        {sites.length === 0 ? (
          <p className="text-sm text-gray-500">No clinical sites yet.</p>
        ) : (
          <ul className="divide-y divide-gray-200 rounded-md border border-gray-200 bg-white">
            {sites.map((site) => {
              const status = getSiteContractStatus(site);
              return (
                <li key={site.id}>
                  <Link
                    href={`/coordinator/sites/${site.id}`}
                    className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-gray-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">{site.name}</p>
                      <p className="text-xs text-gray-500">{site.location}</p>
                    </div>
                    <Badge
                      label={SITE_STATUS_LABELS[status]}
                      className={SITE_STATUS_BADGE_CLASSES[status]}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
