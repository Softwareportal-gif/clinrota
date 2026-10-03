import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole } from "@/lib/require-role";
import { getCoordinatorProfileByUserId } from "@/lib/coordinator";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "@/components/dashboard-header";
import { StatusBadge } from "@/components/status-badge";
import { ENTRUSTMENT_LEVEL_LABELS } from "@/lib/entrustment";

export default async function StudentLogbookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireRole("COORDINATOR");
  const coordinatorProfile = await getCoordinatorProfileByUserId(session.user.id);

  const student = await prisma.studentProfile.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!student || student.programId !== coordinatorProfile.programId) notFound();

  const entries = await prisma.logEntry.findMany({
    where: { studentId: id },
    include: { rotation: { include: { clinicalSite: true } }, review: true },
    orderBy: { occurredAt: "desc" },
  });

  return (
    <main className="min-h-screen bg-gray-50">
      <DashboardHeader title={`${student.user.name} — full logbook`} userName={session.user.name ?? ""} />
      <div className="mx-auto max-w-3xl space-y-4 px-6 py-8">
        <p className="text-sm text-gray-500">{entries.length} case{entries.length === 1 ? "" : "s"} logged</p>

        {entries.length === 0 ? (
          <p className="text-sm text-gray-500">No cases logged yet.</p>
        ) : (
          <ul className="space-y-4">
            {entries.map((entry) => (
              <li key={entry.id} className="rounded-md border border-gray-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{entry.caseTitle}</p>
                    <p className="text-xs text-gray-500">
                      {entry.rotation.clinicalSite.name} · {new Date(entry.occurredAt).toLocaleDateString()} ·{" "}
                      {ENTRUSTMENT_LEVEL_LABELS[entry.studentRole]}
                    </p>
                  </div>
                  <StatusBadge status={entry.status} />
                </div>

                <dl className="mt-3 space-y-2 border-t border-gray-100 pt-3 text-sm">
                  <div>
                    <dt className="text-xs font-medium text-gray-400">Subjective</dt>
                    <dd className="whitespace-pre-wrap text-gray-700">{entry.subjective}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-gray-400">Objective</dt>
                    <dd className="whitespace-pre-wrap text-gray-700">{entry.objectiveFindings}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-gray-400">Assessment</dt>
                    <dd className="whitespace-pre-wrap text-gray-700">{entry.assessment}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-gray-400">Plan</dt>
                    <dd className="whitespace-pre-wrap text-gray-700">{entry.plan}</dd>
                  </div>
                </dl>

                {entry.review && (
                  <p className="mt-3 border-t border-gray-100 pt-3 text-xs text-gray-500">
                    Reviewed: {entry.review.decision}
                    {entry.review.comments ? ` — "${entry.review.comments}"` : ""}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}

        <Link href={`/coordinator/students/${id}`} className="block text-sm text-gray-500 hover:underline">
          ← Back to student record
        </Link>
      </div>
    </main>
  );
}
