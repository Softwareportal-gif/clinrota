import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole } from "@/lib/require-role";
import { getCoordinatorProfileByUserId } from "@/lib/coordinator";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "@/components/dashboard-header";
import { RecalculateScoreButton } from "@/components/recalculate-score-button";
import { OverrideForm } from "./override-form";

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
      rotationScore: { include: { overriddenBy: true } },
    },
  });
  if (!rotation || rotation.programId !== coordinatorProfile.programId) notFound();

  const score = rotation.rotationScore;

  return (
    <main className="min-h-screen bg-gray-50">
      <DashboardHeader title="Score detail" userName={session.user.name ?? ""} />
      <div className="mx-auto max-w-2xl space-y-6 px-6 py-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              <Link href={`/coordinator/students/${rotation.studentId}`} className="hover:underline">
                {rotation.student.user.name}
              </Link>
            </h2>
            <p className="text-sm text-gray-500">
              {rotation.clinicalSite.name} · {new Date(rotation.startDate).toLocaleDateString()} –{" "}
              {new Date(rotation.endDate).toLocaleDateString()}
            </p>
          </div>
          <RecalculateScoreButton rotationId={rotation.id} hasScore={!!score} />
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
                Calculated {new Date(score.computedAt).toLocaleString()}
              </p>
            </div>

            <div className="rounded-md border border-blue-200 bg-blue-50 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-blue-500">
                {score.isOverridden ? "Coordinator override (in effect)" : "Final (not overridden)"}
              </p>
              <Row strong label="Final score" value={`${score.finalScore.toFixed(1)}%`} />
              <Row strong label="Result" value={score.passed ? "Pass" : "Fail"} />
              {score.isOverridden && (
                <div className="mt-3 space-y-1 border-t border-blue-200 pt-3 text-xs text-blue-700">
                  <p>
                    <span className="font-medium">Reason:</span> {score.overrideReason}
                  </p>
                  <p>
                    <span className="font-medium">By:</span> {score.overriddenBy?.name} ·{" "}
                    {score.overriddenAt ? new Date(score.overriddenAt).toLocaleString() : ""}
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

        <Link href="/coordinator" className="block text-sm text-gray-500 hover:underline">
          ← Back to rotations
        </Link>
      </div>
    </main>
  );
}
