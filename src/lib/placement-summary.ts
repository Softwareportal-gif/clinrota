import { prisma } from "@/lib/prisma";
import { getStudentRecordData } from "@/lib/student-record";
import { isCompliant } from "@/lib/compliance-status";
import { rotationPhase } from "@/lib/rotation-status";

export type PlacementChecklistItem = {
  label: string;
  done: boolean;
  // Progress in words, e.g. "8 of 160 hours".
  detail?: string;
  // Where to go to make progress; none when it isn't the student's to do.
  actionLabel?: string;
  actionHref?: string;
};

export type PlacementSummary = {
  id: string;
  siteName: string;
  departmentName: string | null;
  startDate: Date;
  endDate: Date;
  status: string;
  supervisorName: string;
  checklist: PlacementChecklistItem[];
};

const hoursText = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

// Shared by the dashboard's "My Placements" card, the full /student/placements
// list, and the per-rotation to-do detail page — one source of truth for what
// counts as "done" on each checklist item, so the three views can't drift.
// Hours and cases count toward the rotation's requirement (its own override,
// else the program default), matching what's needed to pass; with no
// requirement set, one approved entry is enough.
export async function getPlacementSummaries(studentId: string): Promise<PlacementSummary[]> {
  const data = await getStudentRecordData(studentId);
  if (!data) return [];
  const { rotations, compliance } = data;
  const docsNeedingAttention = compliance.filter((c) => !isCompliant(c.status)).length;
  const allDocsComplete = compliance.length > 0 && docsNeedingAttention === 0;

  const rotationIds = rotations.map((r) => r.id);
  const [hoursGroups, caseGroups] = await Promise.all([
    prisma.timesheetEntry.groupBy({
      by: ["rotationId"],
      where: { rotationId: { in: rotationIds }, status: "APPROVED" },
      _sum: { hours: true },
    }),
    prisma.logEntry.groupBy({
      by: ["rotationId"],
      where: { rotationId: { in: rotationIds }, status: "APPROVED" },
      _count: { _all: true },
    }),
  ]);
  const hoursByRotation = new Map(hoursGroups.map((g) => [g.rotationId, g._sum.hours ?? 0]));
  const casesByRotation = new Map(caseGroups.map((g) => [g.rotationId, g._count._all]));

  return rotations.map((r) => {
    const hasSubmittedEvaluation = r.competencyEvaluations.some((e) => e.status === "SUBMITTED");
    const hours = hoursByRotation.get(r.id) ?? 0;
    const cases = casesByRotation.get(r.id) ?? 0;
    const requiredHours = r.minHoursOverride ?? r.program.defaultMinHours;
    const requiredCases = r.minCasesOverride ?? r.program.defaultMinCases;
    return {
      id: r.id,
      siteName: r.clinicalSite.name,
      departmentName: r.siteDepartment?.name ?? null,
      startDate: r.startDate,
      endDate: r.endDate,
      status: rotationPhase(r),
      supervisorName: r.supervisor.user.name,
      checklist: [
        {
          label: "Required documents",
          done: allDocsComplete,
          detail: allDocsComplete
            ? "All verified"
            : `${docsNeedingAttention} of ${compliance.length} need${docsNeedingAttention === 1 ? "s" : ""} attention`,
          actionLabel: "Upload documents →",
          actionHref: "/student/compliance",
        },
        {
          label: "Approved hours",
          done: requiredHours !== null ? hours >= requiredHours : hours > 0,
          detail: requiredHours !== null ? `${hoursText(hours)} of ${hoursText(requiredHours)} hours` : `${hoursText(hours)} hours`,
          actionLabel: "Log your hours →",
          actionHref: "/student/timesheets",
        },
        {
          label: "Approved cases",
          done: requiredCases !== null ? cases >= requiredCases : cases > 0,
          detail: requiredCases !== null ? `${cases} of ${requiredCases} cases` : `${cases} case${cases === 1 ? "" : "s"}`,
          actionLabel: "Log a case →",
          actionHref: "/student/log/new",
        },
        {
          label: "Supervisor evaluation",
          done: hasSubmittedEvaluation,
          detail: hasSubmittedEvaluation ? "Completed" : "Your supervisor completes this",
        },
      ],
    };
  });
}
