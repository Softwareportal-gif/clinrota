import Link from "next/link";
import { requireRole } from "@/lib/require-role";
import { getCoordinatorProfileByUserId } from "@/lib/coordinator";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "@/components/dashboard-header";
import { AddForm } from "./add-form";
import { ToggleActiveButton } from "./toggle-active-button";
import { RequirementForm } from "./requirement-form";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Competencies" };

export default async function CompetenciesPage() {
  const session = await requireRole("COORDINATOR");
  const coordinatorProfile = await getCoordinatorProfileByUserId(session.user.id);

  const [competencies, requirements] = await Promise.all([
    prisma.competency.findMany({
      where: { programId: coordinatorProfile.programId },
      orderBy: { name: "asc" },
    }),
    prisma.programCompetencyRequirement.findMany({
      where: { programId: coordinatorProfile.programId },
    }),
  ]);
  const reqByCompetency = new Map(requirements.map((r) => [r.competencyId, r]));

  return (
    <main className="min-h-screen bg-gray-50">
      <DashboardHeader title="Competencies" />
      <div className="mx-auto max-w-3xl space-y-6 px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-500">Program: {coordinatorProfile.program.name}</p>
          <Link
            href="/coordinator/competencies/coverage"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
          >
            Coverage report
          </Link>
        </div>

        <AddForm />

        <ul className="divide-y divide-gray-200 rounded-md border border-gray-200 bg-white">
          {competencies.map((c) => {
            const req = reqByCompetency.get(c.id);
            return (
              <li key={c.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {c.name}
                      {!c.isActive && (
                        <span className="ml-2 text-xs font-normal text-gray-400">(inactive)</span>
                      )}
                    </p>
                    {c.description && <p className="text-xs text-gray-500">{c.description}</p>}
                  </div>
                  <ToggleActiveButton competencyId={c.id} isActive={c.isActive} />
                </div>
                <RequirementForm
                  competencyId={c.id}
                  isRequired={!!req}
                  minOccurrences={req?.minOccurrences ?? 1}
                  minEntrustmentLevel={req?.minEntrustmentLevel ?? "DIRECT_SUPERVISION"}
                />
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
