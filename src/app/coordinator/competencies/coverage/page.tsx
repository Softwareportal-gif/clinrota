import Link from "next/link";
import { requireRole } from "@/lib/require-role";
import { getCoordinatorProfileByUserId } from "@/lib/coordinator";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "@/components/dashboard-header";
import { Badge } from "@/components/badge";
import { ENTRUSTMENT_LEVEL_VALUE, ENTRUSTMENT_LEVEL_SHORT_LABELS } from "@/lib/entrustment";
import {
  getCoverageStatus,
  COVERAGE_STATUS_LABELS,
  COVERAGE_STATUS_BADGE_CLASSES,
} from "@/lib/coverage-status";

export default async function CoverageReportPage({
  searchParams,
}: {
  searchParams: Promise<{ cohortId?: string }>;
}) {
  const { cohortId: requestedCohortId } = await searchParams;
  const session = await requireRole("COORDINATOR");
  const coordinatorProfile = await getCoordinatorProfileByUserId(session.user.id);

  const cohorts = await prisma.cohort.findMany({
    where: { programId: coordinatorProfile.programId },
    orderBy: { startDate: "desc" },
  });
  const cohortId = requestedCohortId ?? cohorts[0]?.id;

  const [requirements, students] = await Promise.all([
    prisma.programCompetencyRequirement.findMany({
      where: { programId: coordinatorProfile.programId },
      include: { competency: true },
      orderBy: { competency: { name: "asc" } },
    }),
    cohortId
      ? prisma.studentProfile.findMany({
          where: { programId: coordinatorProfile.programId, cohortId },
          include: { user: true },
          orderBy: { user: { name: "asc" } },
        })
      : Promise.resolve([]),
  ]);

  const competencyIds = requirements.map((r) => r.competencyId);
  const links =
    cohortId && competencyIds.length > 0
      ? await prisma.logEntryCompetency.findMany({
          where: {
            competencyId: { in: competencyIds },
            logEntry: { status: "APPROVED", student: { cohortId } },
          },
          include: {
            logEntry: { select: { studentId: true, studentRole: true, supervisorAssessedRole: true } },
          },
        })
      : [];

  const highestLevelByStudentCompetency = new Map<string, number>();
  for (const link of links) {
    const level =
      ENTRUSTMENT_LEVEL_VALUE[link.logEntry.supervisorAssessedRole ?? link.logEntry.studentRole];
    const key = `${link.logEntry.studentId}:${link.competencyId}`;
    const current = highestLevelByStudentCompetency.get(key);
    if (current === undefined || level > current) highestLevelByStudentCompetency.set(key, level);
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <DashboardHeader title="Competency coverage" userName={session.user.name ?? ""} />
      <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-500">Program: {coordinatorProfile.program.name}</p>
          <div className="flex flex-wrap items-center gap-2">
            {cohorts.map((c) => (
              <Link
                key={c.id}
                href={`/coordinator/competencies/coverage?cohortId=${c.id}`}
                className={`rounded-md border px-3 py-1.5 text-sm font-medium ${
                  c.id === cohortId
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-gray-300 text-gray-700"
                }`}
              >
                {c.name} · {c.academicYear} {c.term}
              </Link>
            ))}
            {cohortId && (
              <a
                href={`/coordinator/cohorts/${cohortId}/export`}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700"
              >
                Export cohort CSV
              </a>
            )}
          </div>
        </div>

        {cohorts.length === 0 ? (
          <p className="text-sm text-gray-500">No cohorts in this program yet.</p>
        ) : requirements.length === 0 ? (
          <p className="text-sm text-gray-500">
            No required competencies configured yet — add some under Competencies.
          </p>
        ) : students.length === 0 ? (
          <p className="text-sm text-gray-500">No students in this cohort.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">Student</th>
                  {requirements.map((r) => (
                    <th key={r.id} className="px-4 py-2 text-left font-medium text-gray-700">
                      {r.competency.name}
                      <span className="block text-xs font-normal text-gray-400">
                        min {ENTRUSTMENT_LEVEL_SHORT_LABELS[r.minEntrustmentLevel]}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {students.map((s) => (
                  <tr key={s.id}>
                    <td className="whitespace-nowrap px-4 py-2 font-medium text-gray-900">
                      <Link href={`/coordinator/students/${s.id}`} className="hover:underline">
                        {s.user.name}
                      </Link>
                    </td>
                    {requirements.map((r) => {
                      const highest =
                        highestLevelByStudentCompetency.get(`${s.id}:${r.competencyId}`) ?? null;
                      const status = getCoverageStatus(
                        highest,
                        ENTRUSTMENT_LEVEL_VALUE[r.minEntrustmentLevel]
                      );
                      return (
                        <td key={r.id} className="whitespace-nowrap px-4 py-2">
                          <Badge
                            label={COVERAGE_STATUS_LABELS[status]}
                            className={COVERAGE_STATUS_BADGE_CLASSES[status]}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Link href="/coordinator/competencies" className="block text-sm text-gray-500 hover:underline">
          ← Back to competencies
        </Link>
      </div>
    </main>
  );
}
