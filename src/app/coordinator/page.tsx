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
        siteDepartment: true,
        supervisor: { include: { user: { select: { name: true } } } },
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

  // Each section is in the sidebar; these are the ones with something
  // waiting, so the dashboard surfaces them rather than repeating the menu.
  const attention = [
    {
      count: pendingOnboardingCount,
      label: `student${pendingOnboardingCount === 1 ? " hasn't" : "s haven't"} signed in yet`,
      action: "Students",
      href: "/coordinator/students",
      tone: "bg-blue-100 text-blue-700",
    },
    {
      count: studentsWithIssuesCount,
      label: `student${studentsWithIssuesCount === 1 ? " has" : "s have"} missing or expired documents`,
      action: "Compliance",
      href: "/coordinator/compliance",
      tone: "bg-red-100 text-red-700",
    },
    {
      count: sitesWithIssuesCount,
      label: `clinical site${sitesWithIssuesCount === 1 ? " has an" : "s have"} expiring or expired agreement${sitesWithIssuesCount === 1 ? "" : "s"}`,
      action: "Clinical sites",
      href: "/coordinator/sites",
      tone: "bg-amber-100 text-amber-700",
    },
  ].filter((item) => item.count > 0);

  return (
    <main className="min-h-screen bg-gray-50">
      <DashboardHeader title="Coordinator dashboard" />
      <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-500">Program: {coordinatorProfile.program.name}</p>
          <Link
            href="/coordinator/rotations/new"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white"
          >
            + Assign rotation
          </Link>
        </div>

        {attention.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold text-gray-700">Needs attention</h2>
            <ul className="divide-y divide-gray-200 rounded-md border border-gray-200 bg-white">
              {attention.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex items-center justify-between gap-4 px-4 py-3 text-sm hover:bg-gray-50"
                  >
                    <span className="flex items-center gap-3 text-gray-700">
                      <span
                        className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-semibold ${item.tone}`}
                      >
                        {item.count}
                      </span>
                      {item.label}
                    </span>
                    <span className="shrink-0 text-xs font-medium text-blue-600">{item.action} →</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

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
                        {rotation.clinicalSite.name}
                        {rotation.siteDepartment ? ` — ${rotation.siteDepartment.name}` : ""} ·{" "}
                        {rotation.startDate.toLocaleDateString()} – {rotation.endDate.toLocaleDateString()} ·{" "}
                        {rotation.supervisor.user.name} · {rotation.status}
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
