import { requireRole } from "@/lib/require-role";
import { getSupervisorProfileByUserId } from "@/lib/supervisor";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "@/components/dashboard-header";
import { PendingReviewList } from "../pending-review-list";

// A supervisor can be someone's ward supervisor without ever being a
// rotation's main supervisor (Rotation.supervisorId) — so this queue is
// entirely separate from /supervisor's, keyed off WardAssignment instead.
export default async function WardReviewDashboard() {
  const session = await requireRole("SUPERVISOR");
  const supervisorProfile = await getSupervisorProfileByUserId(session.user.id);

  const pending = await prisma.logEntry.findMany({
    where: {
      status: "SUBMITTED",
      wardAssignment: { wardSupervisorId: supervisorProfile.id, endedAt: null },
    },
    include: {
      student: { include: { user: true } },
      rotation: { include: { clinicalSite: true } },
      wardAssignment: true,
    },
    orderBy: [{ wardAssignment: { wardName: "asc" } }, { student: { user: { name: "asc" } } }, { submittedAt: "desc" }],
  });

  return (
    <main className="min-h-screen bg-gray-50">
      <DashboardHeader title="Ward review" userId={session.user.id} />
      <div className="mx-auto max-w-3xl px-6 py-8">
        <p className="mb-4 text-sm text-gray-500">
          Case entries submitted by students on wards where you&apos;re the ward supervisor.
        </p>

        <PendingReviewList
          entries={pending.map((entry) => ({
            id: entry.id,
            caseTitle: entry.caseTitle,
            studentName: entry.student.user.name,
            clinicalSiteName: entry.rotation.clinicalSite.name,
            wardName: entry.wardAssignment?.wardName,
            submittedAt: entry.submittedAt,
          }))}
          userId={session.user.id}
        />

      </div>
    </main>
  );
}
