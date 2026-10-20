import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole } from "@/lib/require-role";
import { getCoordinatorProfileByUserId } from "@/lib/coordinator";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "@/components/dashboard-header";
import { RecalculateScoreButton } from "@/components/recalculate-score-button";
import { OverrideForm } from "./override-form";
import { formatDate, formatDateTime } from "@/lib/format-date";
import type { Metadata } from "next";
import { checkRequirements } from "@/lib/rotation-requirements";

export const metadata: Metadata = { title: "Rotation score" };

function Row({
  label,
  value,
  strong,
  small,
}: {
  label: string;
  value: string;
  strong?: boolean;
  small?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between ${small ? "text-xs" : "text-sm"}`}>
      <dt className={strong ? "font-semibold text-gray-900" : "text-gray-600"}>{label}</dt>
      <dd className={strong ? "font-semibold text-gray-900" : "text-gray-600"}>{value}</dd>
    </div>
  );
}

export default async function ScoreDetailPage({
  params,
}: {
  params: Promise<{ rotationId: string }>;
}) {
  const { rotationId } = await params;
  const session = await requireRole("COORDINATOR");
  const coordinatorProfile = await getCoordinatorProfileByUserId(session.user.id);

  const rotation = await prisma.rotation.findUnique({
    where: { id: rotationId },
    include: {
      student: { include: { user: true } },
      clinicalSite: true,
      program: { select: { defaultMinHours: true, defaultMinCases: true } },
      rotationScore: { include: { overriddenBy: true } },
    },
  });
  if (!rotation || rotation.programId !== coordinatorProfile.programId) notFound();

  const score = rotation.rotationScore;

  // Approved hours and cases against the requirement: a rotation can't pass
  // without them, whatever its score (see computeRotationScore).
  const [hoursAgg, approvedCases] = await Promise.all([
    prisma.timesheetEntry.aggregate({ where: { rotationId, status: "APPROVED" }, _sum: { hours: true } }),
    prisma.logEntry.count({ where: { rotationId, status: "APPROVED" } }),
  ]);
  const approvedHours = hoursAgg._sum.hours ?? 0;
  const requiredHours = rotation.minHoursOverride ?? rotation.program.defaultMinHours;
  const requiredCases = rotation.minCasesOverride ?? rotation.program.defaultMinCases;
  const requirements = checkRequirements({ approvedHours, requiredHours, approvedCases, requiredCases });

  return (
    <main className="min-h-screen bg-gray-50">
      <DashboardHeader back={{ href: "/coordinator", label: "Dashboard" }} title="Score detail" />
      <div className="mx-auto max-w-2xl space-y-6 px-6 py-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              <Link href={`/coordinator/students/${rotation.studentId}`} className="hover:underline">
                {rotation.student.user.name}
              </Link>
            </h2>
            <p className="text-sm text-gray-500">
              {rotation.clinicalSite.name} · {formatDate(rotation.startDate)} –{" "}
              {formatDate(rotation.endDate)}
            </p>
          </div>
          <RecalculateScoreButton rotationId={rotation.id} hasScore={!!score} />
        </div>

        <div className="rounded-md border border-gray-200 bg-white p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Requirements</p>
          <dl className="space-y-2">
            <Row label="Approved hours" value={requiredHours !== null ? `${approvedHours} of ${requiredHours}` : `${approvedHours} (none required)`} />
            <Row label="Approved cases" value={requiredCases !== null ? `${approvedCases} of ${requiredCases}` : `${approvedCases} (none required)`} />
          </dl>
          <p className={`mt-2 text-xs ${requirements.met ? "text-green-700" : "text-amber-700"}`}>
            {requirements.met ? "Requirements met." : `Can't pass yet: needs ${requirements.missing.join(" and ")}.`}
          </p>
        </div>

        {!score ? (
          <p className="rounded-md border border-gray-200 bg-white p-4 text-sm text-gray-500">
            No score calculated yet. Click Calculate — this requires a finalized supervisor
            evaluation for this rotation.
          </p>
        ) : (
          <>
            <div className="rounded-md border border-gray-200 bg-white p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Computed
              </p>
              <dl className="space-y-2">
                <Row label="Supervisor score" value={`${score.supervisorScore.toFixed(1)}%`} />
                <Row label="Logbook score" value={`${score.logbookScore.toFixed(1)}%`} />
                <div className="ml-4 space-y-1">
                  <Row
                    small
                    label="— Competency coverage"
                    value={`${score.logbookCaseCoverageScore.toFixed(1)}%`}
                  />
                  <Row
                    small
                    label="— Approval rate"
                    value={`${score.logbookApprovalRateScore.toFixed(1)}%`}
                  />
                  <Row
                    small
                    label="— Timeliness"
                    value={`${score.logbookTimelinessScore.toFixed(1)}%`}
                  />
                  <Row
                    small
                    label="— SOAP completeness"
                    value={`${score.logbookCompletenessScore.toFixed(1)}%`}
                  />
                </div>
                <Row
                  strong
                  label="Computed final score"
                  value={`${score.computedFinalScore.toFixed(1)}%`}
                />
              </dl>
              <p className="mt-2 text-xs text-gray-400">
                Calculated {formatDateTime(score.computedAt)}
              </p>
            </div>

            <div className="rounded-md border border-blue-200 bg-blue-50 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-blue-500">
                {score.isOverridden ? "Coordinator override (in effect)" : "Final (not overridden)"}
              </p>
              <Row strong label="Final score" value={`${score.finalScore.toFixed(1)}%`} />
              <Row strong label="Result" value={score.passed ? "Pass" : requirements.met ? "Fail" : "Not passed (requirements not met)"} />
              {score.passed && !requirements.met && !score.isOverridden && (
                <p className="mt-2 text-xs text-amber-700">Calculated before the requirements were checked. Recalculate to update the result.</p>
              )}
              {score.isOverridden && (
                <div className="mt-3 space-y-1 border-t border-blue-200 pt-3 text-xs text-blue-700">
                  <p>
                    <span className="font-medium">Reason:</span> {score.overrideReason}
                  </p>
                  <p>
                    <span className="font-medium">By:</span> {score.overriddenBy?.name} ·{" "}
                    {score.overriddenAt ? formatDateTime(score.overriddenAt) : ""}
                  </p>
                </div>
              )}
            </div>

            <OverrideForm
              rotationId={rotation.id}
              currentFinalScore={score.finalScore}
              currentReason={score.overrideReason ?? ""}
            />
          </>
        )}

      </div>
    </main>
  );
}
