import { prisma } from "@/lib/prisma";
import { ENTRUSTMENT_LEVEL_VALUE } from "@/lib/entrustment";
import { getCoverageStatus, type CoverageStatus } from "@/lib/coverage-status";

export type StudentCoverageItem = {
  competencyId: string;
  competencyName: string;
  minLevelValue: number;
  highestLevelValue: number | null;
  status: CoverageStatus;
};

export type StudentCoverageSummary = {
  items: StudentCoverageItem[];
  metCount: number;
  totalCount: number;
  percent: number | null; // null when there are no required competencies to report against
};

// Same computation as the cohort-wide coverage report
// (src/app/coordinator/competencies/coverage/page.tsx), scoped to one
// student instead of a whole cohort.
export async function getStudentCoverage(
  studentId: string,
  programId: string
): Promise<StudentCoverageSummary> {
  const requirements = await prisma.programCompetencyRequirement.findMany({
    where: { programId },
    include: { competency: true },
    orderBy: { competency: { name: "asc" } },
  });

  if (requirements.length === 0) {
    return { items: [], metCount: 0, totalCount: 0, percent: null };
  }

  const links = await prisma.logEntryCompetency.findMany({
    where: {
      competencyId: { in: requirements.map((r) => r.competencyId) },
      logEntry: { status: "APPROVED", studentId },
    },
    include: {
      logEntry: { select: { studentRole: true, supervisorAssessedRole: true } },
    },
  });

  const highestLevelByCompetency = new Map<string, number>();
  for (const link of links) {
    const level =
      ENTRUSTMENT_LEVEL_VALUE[link.logEntry.supervisorAssessedRole ?? link.logEntry.studentRole];
    const current = highestLevelByCompetency.get(link.competencyId);
    if (current === undefined || level > current) highestLevelByCompetency.set(link.competencyId, level);
  }

  const items: StudentCoverageItem[] = requirements.map((r) => {
    const highestLevelValue = highestLevelByCompetency.get(r.competencyId) ?? null;
    const minLevelValue = ENTRUSTMENT_LEVEL_VALUE[r.minEntrustmentLevel];
    return {
      competencyId: r.competencyId,
      competencyName: r.competency.name,
      minLevelValue,
      highestLevelValue,
      status: getCoverageStatus(highestLevelValue, minLevelValue),
    };
  });

  const metCount = items.filter((i) => i.status === "MET").length;

  return {
    items,
    metCount,
    totalCount: items.length,
    percent: (metCount / items.length) * 100,
  };
}
