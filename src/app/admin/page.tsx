import Link from "next/link";
import { requireRole } from "@/lib/require-role";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "@/components/dashboard-header";
import { getInstitutionIdForUser } from "@/lib/admin";
import { AddCoordinatorForm } from "./add-coordinator-form";

export default async function SuperAdminDashboard() {
  const session = await requireRole("SUPER_ADMIN");
  const institutionId = await getInstitutionIdForUser(session.user.id);

  const programs = await prisma.program.findMany({
    where: { institutionId },
    include: {
      disciplineTemplate: true,
      coordinatorProfiles: {
        include: { user: { select: { name: true, email: true } } },
        orderBy: { user: { name: "asc" } },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <main className="min-h-screen bg-gray-50">
      <DashboardHeader title="Super admin" userName={session.user.name ?? ""} />
      <div className="mx-auto max-w-3xl space-y-6 px-6 py-8">
        <p className="text-sm text-gray-500">
          Institution, program, and user management will live here — kept
          minimal for the pilot.
        </p>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Programs</h2>
            <Link
              href="/admin/programs/new"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white"
            >
              + New program
            </Link>
          </div>
          {programs.length === 0 ? (
            <p className="text-sm text-gray-500">No programs yet.</p>
          ) : (
            <ul className="divide-y divide-gray-200 rounded-md border border-gray-200 bg-white">
              {programs.map((p) => (
                <li key={p.id} className="px-4 py-3">
                  <p className="text-sm font-medium text-gray-900">
                    {p.name}
                    {p.degreeLevel ? ` (${p.degreeLevel})` : ""}
                  </p>
                  <p className="text-xs text-gray-500">
                    Discipline template: {p.disciplineTemplate.name}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {p.coordinatorProfiles.length === 0
                      ? "No coordinator yet — add one so they can enrol students."
                      : `Coordinator${p.coordinatorProfiles.length > 1 ? "s" : ""}: ${p.coordinatorProfiles
                          .map((c) => `${c.user.name} (${c.user.email})`)
                          .join(", ")}`}
                  </p>
                  <AddCoordinatorForm programId={p.id} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
