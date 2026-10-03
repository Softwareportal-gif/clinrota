import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole } from "@/lib/require-role";
import { getCoordinatorProfileByUserId } from "@/lib/coordinator";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "@/components/dashboard-header";
import { averageRatingPercent, flattenRubric, parseRubric } from "@/lib/discipline-template";

export default async function EvaluationBreakdownPage({
  params,
}: {
  params: Promise<{ id: string; evaluationId: string }>;
}) {
  const { id, evaluationId } = await params;
  const session = await requireRole("COORDINATOR");
  const coordinatorProfile = await getCoordinatorProfileByUserId(session.user.id);

  const evaluation = await prisma.competencyEvaluation.findUnique({
    where: { id: evaluationId },
    include: {
      ratings: true,
      student: { include: { user: true } },
      supervisor: true,
      rotation: { include: { clinicalSite: true, program: { include: { disciplineTemplate: true } } } },
    },
  });
  if (
    !evaluation ||
    evaluation.studentId !== id ||
    evaluation.student.programId !== coordinatorProfile.programId
  ) {
    notFound();
  }

  const rubric = parseRubric(evaluation.rotation.program.disciplineTemplate.rubric);
  const maxLevel = Math.max(...rubric.scaleLevels.map((s) => s.value));
  const levelBySubDimension: Record<string, number> = Object.fromEntries(
    evaluation.ratings.map((r) => [r.subDimension, r.level])
  );
  const overallPercent = averageRatingPercent(evaluation.ratings, rubric.scaleLevels);

  return (
    <main className="min-h-screen bg-gray-50">
      <DashboardHeader title="Evaluation breakdown" userName={session.user.name ?? ""} />
      <div className="mx-auto max-w-2xl space-y-6 px-6 py-8">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{evaluation.student.user.name}</h2>
          <p className="text-sm text-gray-500">
            {evaluation.rotation.clinicalSite.name} · Evaluated by {evaluation.supervisor.name} ·{" "}
            {new Date(evaluation.evaluationDate).toLocaleDateString()}
          </p>
        </div>

        <div className="rounded-md border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              {evaluation.status === "SUBMITTED" ? "Finalized" : "Draft (not yet finalized)"}
            </p>
            {overallPercent !== null && (
              <p className="text-sm font-semibold text-gray-900">{overallPercent.toFixed(1)}% overall</p>
            )}
          </div>
          <ul className="space-y-2">
            {flattenRubric(rubric).map(({ subDimension, label }) => (
              <li key={subDimension} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{label}</span>
                <span className="font-medium text-gray-900">
                  {levelBySubDimension[subDimension] ?? "—"} / {maxLevel}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {evaluation.overallComments && (
          <div className="rounded-md border border-gray-200 bg-white p-4">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Supervisor comments
            </p>
            <p className="whitespace-pre-wrap text-sm text-gray-700">{evaluation.overallComments}</p>
          </div>
        )}

        <Link href={`/coordinator/students/${id}`} className="block text-sm text-gray-500 hover:underline">
          ← Back to student record
        </Link>
      </div>
    </main>
  );
}
