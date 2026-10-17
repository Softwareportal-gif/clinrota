import { requireRole } from "@/lib/require-role";
import { getCoordinatorProfileByUserId } from "@/lib/coordinator";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "@/components/dashboard-header";
import { AddForm } from "./add-form";
import { ToggleActiveButton } from "./toggle-active-button";

export default async function DocumentTypesPage() {
  const session = await requireRole("COORDINATOR");
  const coordinatorProfile = await getCoordinatorProfileByUserId(session.user.id);

  const types = await prisma.requiredDocumentType.findMany({
    where: { programId: coordinatorProfile.programId },
    orderBy: { name: "asc" },
  });

  return (
    <main className="min-h-screen bg-gray-50">
      <DashboardHeader title="Required document types" />
      <div className="mx-auto max-w-2xl space-y-6 px-6 py-8">
        <p className="text-sm text-gray-500">Program: {coordinatorProfile.program.name}</p>

        <AddForm />

        <ul className="divide-y divide-gray-200 rounded-md border border-gray-200 bg-white">
          {types.map((type) => (
            <li key={type.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  {type.name}
                  {!type.isActive && (
                    <span className="ml-2 text-xs font-normal text-gray-400">(inactive)</span>
                  )}
                </p>
                {type.description && <p className="text-xs text-gray-500">{type.description}</p>}
              </div>
              <ToggleActiveButton documentTypeId={type.id} isActive={type.isActive} />
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
