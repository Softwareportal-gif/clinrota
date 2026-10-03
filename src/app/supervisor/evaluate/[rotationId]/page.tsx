import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole } from "@/lib/require-role";
import { getSupervisorProfileByUserId } from "@/lib/supervisor";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "@/components/dashboard-header";
import { flattenRubric, parseRubric } from "@/lib/discipline-template";
import { ENTRUSTMENT_LEVEL_VALUE } from "@/lib/entrustment";
import { EvaluationForm } from "./evaluation-form";

export default async function EvaluateRotationPage({
  params,
}: {
  params: Promise<{ rotationId: string }>;
}) {
  const { rotationId } = await params;
  const session = await requireRole("SUPERVISOR");
  const supervisorProfile = await getSupervisorProfileByUserId(session.user.id);

  const rotation = await prisma.rotation.findUnique({
    where: { id: rotationId },
    include: {
      student: { include: { user: true } },
      clinicalSite: true,
      program: { include: { disciplineTemplate: true } },
    },
  });
  if (!rotation || rotation.supervisorId !== supervisorProfile.id) notFound();

  const rubric = parseRubric(rotation.program.disciplineTemplate.rubric);
  const maxLevel = Math.max(...rubric.scaleLevels.map((s) => s.value));

  const [competencies, evaluation] = await Promise.all([
    prisma.competency.findMany({
      where: { programId: rotation.programId, isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.competencyEvaluation.findFirst({
      where: { rotationId, studentId: rotation.studentId },
      include: { ratings: true },
    }),
  ]);

  const approvedLinks = await prisma.logEntryCompetency.findMany({
    where: {
      competencyId: { in: competencies.map((c) => c.id) },
      logEntry: { rotationId, status: "APPROVED" },
    },
    include: { logEntry: { select: { studentRole: true, supervisorAssessedRole: true } } },
  });

  const statsByCompetency = new Map<string, { count: number; totalLevel: number }>();
  for (const link of approvedLinks) {
    const level =
      ENTRUSTMENT_LEVEL_VALUE[link.logEntry.supervisorAssessedRole ?? link.logEntry.studentRole];
    const cur = statsByCompetency.get(link.competencyId) ?? { count: 0, totalLevel: 0 };
    cur.count += 1;
    cur.totalLevel += level;
    statsByCompetency.set(link.competencyId, cur);
  }

  const competencyContext = competencies.map((c) => {
    const stat = statsByCompetency.get(c.id);
    return {
      id: c.id,
      name: c.name,
      approvedCount: stat?.count ?? 0,
      avgEntrustmentLevel: stat ? stat.totalLevel / stat.count : null,
    };
  });

  const existingLevels: Record<string, number> = Object.fromEntries(
    (evaluation?.ratings ?? []).map((r) => [r.subDimension, r.level])
  );

  const isFinal = evaluation?.status === "SUBMITTED";

  // Read-only context for the main supervisor — ward supervisors do their
  // own review/attestation independently; this never feeds grading.
  const wardActivity = await prisma.logEntry.findMany({
    where: { rotationId, wardAssignmentId: { not: null } },
    include: { wardAssignment: { include: { wardSupervisor: { include: { user: true } } } }, review: true },
    orderBy: { occurredAt: "desc" },
  });

  return (
    <main className="min-h-screen bg-gray-50">
      <DashboardHeader title="Competency evaluation" userName={session.user.name ?? ""} userId={session.user.id} />
      <div className="mx-auto max-w-2xl space-y-6 px-6 py-8">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{rotation.student.user.name}</h2>
          <p className="text-sm text-gray-500">
            {rotation.clinicalSite.name} · {new Date(rotation.startDate).toLocaleDateString()} –{" "}
            {new Date(rotation.endDate).toLocaleDateString()}
          </p>
        </div>

        {isFinal ? (
          <div className="space-y-4">
            <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
              Finalized on {new Date(evaluation!.updatedAt).toLocaleString()}. Contact a
              coordinator to make changes.
            </p>
            <ul className="space-y-2 rounded-md border border-gray-200 bg-white p-4">
              {flattenRubric(rubric).map(({ subDimension, label }) => (
                <li key={subDimension} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{label}</span>
                  <span className="font-medium text-gray-900">
                    {existingLevels[subDimension]} / {maxLevel}
                  </span>
                </li>
              ))}
            </ul>
            {evaluation?.overallComments && (
              <p className="whitespace-pre-wrap rounded-md border border-gray-200 bg-white p-4 text-sm text-gray-600">
                {evaluation.overallComments}
              </p>
            )}
          </div>
        ) : (
          <EvaluationForm
            rotationId={rotationId}
            rubric={rubric}
            existingLevels={existingLevels}
            initialOverallComments={evaluation?.overallComments ?? ""}
            competencyContext={competencyContext}
          />
        )}

        {wardActivity.length > 0 && (
          <div>
            <h2 className="mb-3 text-sm font-semibold text-gray-700">Ward-level review activity</h2>
            <ul className="space-y-2 rounded-md border border-gray-200 bg-white p-4 text-sm">
              {wardActivity.map((entry) => (
                <li key={entry.id} className="border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                  <p className="text-gray-900">
                    {entry.caseTitle} — {entry.wardAssignment!.wardName} (
                    {entry.wardAssignment!.wardSupervisor.user.name})
                  </p>
                  <p className="text-xs text-gray-500">
                    {entry.review
                      ? `${entry.review.decision}${entry.review.attested ? ", attested" : ""}${
                          entry.review.comments ? ` — "${entry.review.comments}"` : ""
                        }`
                      : "Awaiting ward supervisor review"}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}

        <Link href="/supervisor" className="block text-sm text-gray-500 hover:underline">
          ← Back to dashboard
        </Link>
      </div>
    </main>
  );
}
