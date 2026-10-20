import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/require-role";
import { getCoordinatorProfileByUserId } from "@/lib/coordinator";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "@/components/dashboard-header";
import { formatDateRange } from "@/lib/format-date";
import { rotationPhase, rotationPhaseLabel } from "@/lib/rotation-status";
import type { RotationStatus } from "@/generated/prisma/client";
import { PhasePill } from "./phase-pill";

export const metadata: Metadata = { title: "Rotations" };

const GROUPS: RotationStatus[] = ["ACTIVE", "SCHEDULED", "COMPLETED", "CANCELLED"];

// Every rotation in the program, grouped by where it is in its dates, with
// a link to view, change, end or cancel each one.
export default async function RotationsPage() {
  const session = await requireRole("COORDINATOR");
  const coordinatorProfile = await getCoordinatorProfileByUserId(session.user.id);

  const rotations = await prisma.rotation.findMany({
    where: { programId: coordinatorProfile.programId },
    include: {
      student: { include: { user: { select: { name: true } } } },
      clinicalSite: { select: { name: true } },
      siteDepartment: { select: { name: true } },
      supervisor: { include: { user: { select: { name: true } } } },
    },
    orderBy: [{ startDate: "desc" }, { student: { user: { name: "asc" } } }],
  });
  const now = new Date();
  const withPhase = rotations.map((r) => ({ ...r, phase: rotationPhase(r, now) }));

  return (
    <main className="min-h-screen bg-gray-50">
      <DashboardHeader title="Rotations" />
      <div className="mx-auto max-w-4xl space-y-8 px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-500">
            Program: {coordinatorProfile.program.name} · {rotations.length} rotation{rotations.length === 1 ? "" : "s"}
          </p>
          <Link href="/coordinator/rotations/new" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white">
            + Assign rotations
          </Link>
        </div>

        {rotations.length === 0 && <p className="text-sm text-gray-600">No rotations yet. Assign one to get started.</p>}

        {GROUPS.map((group) => {
          const rows = withPhase.filter((r) => r.phase === group);
          if (rows.length === 0) return null;
          return (
            <section key={group}>
              <h2 className="mb-2 text-sm font-semibold text-gray-900">
                {rotationPhaseLabel(group)} <span className="font-normal text-gray-500">({rows.length})</span>
              </h2>
              <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
                {rows.map((r) => (
                  <li key={r.id}>
                    <Link href={`/coordinator/rotations/${r.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">{r.student.user.name}</p>
                        <p className="truncate text-xs text-gray-500">
                          {r.clinicalSite.name}
                          {r.siteDepartment ? ` — ${r.siteDepartment.name}` : ""} · {formatDateRange(r.startDate, r.endDate)} ·{" "}
                          {r.supervisor.user.name}
                        </p>
                      </div>
                      <PhasePill phase={r.phase} />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </main>
  );
}
