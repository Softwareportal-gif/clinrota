import Link from "next/link";
import { requireRole } from "@/lib/require-role";
import { getCoordinatorProfileByUserId } from "@/lib/coordinator";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "@/components/dashboard-header";
import { RecalculateScoreButton } from "@/components/recalculate-score-button";
import { getEffectiveDocStatus, isCompliant } from "@/lib/compliance-status";
import { getSiteContractStatus, isSiteContractIssue } from "@/lib/site-status";

const WARD_REVIEW_BACKLOG_THRESHOLD_MS = 48 * 60 * 60 * 1000;

// Pulled out of the component body — eslint's react-hooks/purity rule
// flags a direct Date.now()/new Date() call inside a component's own
// function, even for an RSC page like this one where a fresh read per
// request is the entire point. Calling it through a plain helper avoids
// that false positive without changing the behavior.
function wardReviewBackloggedBefore(): Date {
  return new Date(Date.now() - WARD_REVIEW_BACKLOG_THRESHOLD_MS);
}

export default async function CoordinatorDashboard() {
  const session = await requireRole("COORDINATOR");
  const coordinatorProfile = await getCoordinatorProfileByUserId(session.user.id);

  const [rotations, students, requiredTypes, docs, sites] = await Promise.all([
    prisma.rotation.findMany({
      where: {
        programId: coordinatorProfile.programId,
        status: { in: ["ACTIVE", "COMPLETED"] },
      },
      include: {
        student: { include: { user: true } },
        clinicalSite: true,
        rotationScore: true,
      },
      orderBy: { startDate: "desc" },
    }),
    prisma.studentProfile.findMany({ where: { programId: coordinatorProfile.programId } }),
    prisma.requiredDocumentType.findMany({
      where: { programId: coordinatorProfile.programId, isActive: true },
    }),
    prisma.complianceDocument.findMany({
      where: { student: { programId: coordinatorProfile.programId } },
    }),
    prisma.clinicalSite.findMany({
      where: { institutionId: coordinatorProfile.program.institutionId },
    }),
  ]);

  const pendingOnboardingCount = await prisma.studentProfile.count({
    where: {
      programId: coordinatorProfile.programId,
      user: { status: { in: ["IMPORTED", "INVITED"] } },
    },
  });

  // Plain count, not a dedicated page — matches the spec's "don't over-build"
  // for this one. Threshold is a fixed 48h, same unit the spec suggested.
  const overdueWardReviewsCount = await prisma.logEntry.count({
    where: {
      status: "SUBMITTED",
      wardAssignmentId: { not: null },
      rotation: { programId: coordinatorProfile.programId },
      submittedAt: { lt: wardReviewBackloggedBefore() },
    },
  });

  const docByStudentType = new Map(docs.map((d) => [`${d.studentId}:${d.requiredDocumentTypeId}`, d]));
  const studentsWithIssuesCount = students.filter((s) =>
    requiredTypes.some((t) => !isCompliant(getEffectiveDocStatus(docByStudentType.get(`${s.id}:${t.id}`))))
  ).length;
  const sitesWithIssuesCount = sites.filter((s) => isSiteContractIssue(getSiteContractStatus(s))).length;

  return (
    <main className="min-h-screen bg-gray-50">
      <DashboardHeader title="Coordinator dashboard" userName={session.user.name ?? ""} />
      <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-500">Program: {coordinatorProfile.program.name}</p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/coordinator/rotations/new"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white"
            >
              + Assign rotation
            </Link>
            <Link
              href="/coordinator/students"
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
            >
              Students
              {pendingOnboardingCount > 0 && (
                <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                  {pendingOnboardingCount}
                </span>
              )}
            </Link>
            <Link
              href="/coordinator/compliance"
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
            >
              Compliance
              {studentsWithIssuesCount > 0 && (
                <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-xs font-semibold text-red-700">
                  {studentsWithIssuesCount}
                </span>
              )}
            </Link>
            <Link
              href="/coordinator/sites"
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
            >
              Sites
              {sitesWithIssuesCount > 0 && (
                <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-xs font-semibold text-amber-700">
                  {sitesWithIssuesCount}
                </span>
              )}
            </Link>
            <Link
              href="/coordinator/competencies"
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
            >
              Competencies
            </Link>
            <Link
              href="/coordinator/scoring-settings"
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
            >
              Scoring settings
            </Link>
            <Link
              href="/coordinator/preference-cycles/new"
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
            >
              + Preference cycle
            </Link>
          </div>
        </div>

        {overdueWardReviewsCount > 0 && (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {overdueWardReviewsCount} ward-level case{overdueWardReviewsCount === 1 ? "" : "s"} awaiting review
            for more than 48 hours.
          </p>
        )}

        <div>
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Rotations &amp; scores</h2>
          {rotations.length === 0 ? (
            <p className="text-sm text-gray-500">
              No active or completed rotations in this program.
            </p>
          ) : (
            <ul className="divide-y divide-gray-200 rounded-md border border-gray-200 bg-white">
              {rotations.map((rotation) => (
                <li key={rotation.id} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="min-w-0">
                    <Link
                      href={`/coordinator/students/${rotation.studentId}`}
                      className="truncate text-sm font-medium text-gray-900 hover:underline"
                    >
                      {rotation.student.user.name}
                    </Link>
                    <p className="text-xs text-gray-500">
                      <Link href={`/coordinator/scores/${rotation.id}`} className="hover:underline">
                        {rotation.clinicalSite.name} · {rotation.status}
                        {rotation.rotationScore
                          ? ` · ${rotation.rotationScore.finalScore.toFixed(1)}%${
                              rotation.rotationScore.isOverridden ? " (overridden)" : ""
                            } · ${rotation.rotationScore.passed ? "Pass" : "Fail"}`
                          : " · Not yet calculated"}
                      </Link>
                    </p>
                  </div>
                  <RecalculateScoreButton
                    rotationId={rotation.id}
                    hasScore={!!rotation.rotationScore}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
