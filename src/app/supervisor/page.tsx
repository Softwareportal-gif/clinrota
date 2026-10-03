import Link from "next/link";
import { requireRole } from "@/lib/require-role";
import { getSupervisorProfileByUserId } from "@/lib/supervisor";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "@/components/dashboard-header";
import { PendingReviewList } from "./pending-review-list";

export default async function SupervisorDashboard() {
  const session = await requireRole("SUPERVISOR");
  const supervisorProfile = await getSupervisorProfileByUserId(session.user.id);

  const pending = await prisma.logEntry.findMany({
    where: {
      status: "SUBMITTED",
      rotation: { supervisorId: supervisorProfile.id, status: "ACTIVE" },
    },
    include: {
      student: { include: { user: true } },
      rotation: { include: { clinicalSite: true } },
    },
    orderBy: { submittedAt: "desc" },
  });

  const [isWardEligible, wardPendingCount] = await Promise.all([
    prisma.wardSupervisorEligibility.findFirst({ where: { supervisorProfileId: supervisorProfile.id } }),
    prisma.logEntry.count({
      where: { status: "SUBMITTED", wardAssignment: { wardSupervisorId: supervisorProfile.id, endedAt: null } },
    }),
  ]);

  const activeRotations = await prisma.rotation.findMany({
    where: { supervisorId: supervisorProfile.id, status: "ACTIVE" },
    include: { student: { include: { user: true } }, clinicalSite: true },
  });
  const evaluations = await prisma.competencyEvaluation.findMany({
    where: { rotationId: { in: activeRotations.map((r) => r.id) } },
  });
  const evaluationByRotation = new Map(evaluations.map((e) => [e.rotationId, e]));

  return (
    <main className="min-h-screen bg-gray-50">
      <DashboardHeader title="Pending review" userName={session.user.name ?? ""} userId={session.user.id} />
      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-4 flex items-center justify-end gap-2">
          {isWardEligible && (
            <Link
              href="/supervisor/ward-review"
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700"
            >
              Ward review{wardPendingCount > 0 ? ` (${wardPendingCount})` : ""}
            </Link>
          )}
          <Link
            href="/supervisor/timesheets"
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700"
          >
            Timesheets
          </Link>
        </div>

        <PendingReviewList
          entries={pending.map((entry) => ({
            id: entry.id,
            caseTitle: entry.caseTitle,
            studentName: entry.student.user.name,
            clinicalSiteName: entry.rotation.clinicalSite.name,
            submittedAt: entry.submittedAt,
          }))}
          userId={session.user.id}
        />

        <div>
          <h2 className="mb-3 mt-8 text-sm font-semibold text-gray-700">
            Competency evaluations
          </h2>
          {activeRotations.length === 0 ? (
            <p className="text-sm text-gray-500">No active rotations.</p>
          ) : (
            <ul className="divide-y divide-gray-200 rounded-md border border-gray-200 bg-white">
              {activeRotations.map((rotation) => {
                const evaluation = evaluationByRotation.get(rotation.id);
                const statusLabel = !evaluation
                  ? "No evaluation yet"
                  : evaluation.status === "SUBMITTED"
                    ? "Final"
                    : "Draft";
                return (
                  <li key={rotation.id}>
                    <Link
                      href={`/supervisor/evaluate/${rotation.id}`}
                      className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-gray-50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {rotation.student.user.name}
                        </p>
                        <p className="text-xs text-gray-500">{rotation.clinicalSite.name}</p>
                      </div>
                      <span className="shrink-0 text-xs font-medium text-gray-500">
                        {statusLabel}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
