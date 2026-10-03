import { prisma } from "@/lib/prisma";
import { getStudentRecordData } from "@/lib/student-record";
import { isCompliant } from "@/lib/compliance-status";

export type PlacementChecklistItem = {
  label: string;
  done: boolean;
  actionLabel: string;
  actionHref: string;
};

export type PlacementSummary = {
  id: string;
  siteName: string;
  departmentName: string | null;
  startDate: Date;
  endDate: Date;
  status: string;
  preceptorName: string;
  checklist: PlacementChecklistItem[];
};

// Shared by the dashboard's "My Placements" card, the full /student/placements
// list, and the per-rotation to-do detail page — one source of truth for what
// counts as "done" on each checklist item, so the three views can't drift.
export async function getPlacementSummaries(studentId: string): Promise<PlacementSummary[]> {
  const data = await getStudentRecordData(studentId);
  if (!data) return [];
  const { rotations, compliance } = data;
  const allDocsComplete = compliance.length > 0 && compliance.every((c) => isCompliant(c.status));

  const rotationIds = rotations.map((r) => r.id);
  const [timesheetGroups, logEntryGroups] = await Promise.all([
    prisma.timesheetEntry.groupBy({
      by: ["rotationId"],
      where: { rotationId: { in: rotationIds } },
      _count: { _all: true },
    }),
    prisma.logEntry.groupBy({
      by: ["rotationId"],
      where: { rotationId: { in: rotationIds } },
      _count: { _all: true },
    }),
  ]);
  const timesheetCountByRotation = new Map(timesheetGroups.map((g) => [g.rotationId, g._count._all]));
  const logCountByRotation = new Map(logEntryGroups.map((g) => [g.rotationId, g._count._all]));

  return rotations.map((r) => {
    const hasSubmittedEvaluation = r.competencyEvaluations.some((e) => e.status === "SUBMITTED");
    return {
      id: r.id,
      siteName: r.clinicalSite.name,
      departmentName: r.siteDepartment?.name ?? null,
      startDate: r.startDate,
      endDate: r.endDate,
      status: r.status,
      preceptorName: r.supervisor.user.name,
      checklist: [
        {
          label: "Required documents",
          done: allDocsComplete,
          actionLabel: "Upload documents →",
          actionHref: "/student/compliance",
        },
        {
          label: "Timesheet logged",
          done: (timesheetCountByRotation.get(r.id) ?? 0) > 0,
          actionLabel: "Log your timesheet →",
          actionHref: "/student/timesheets",
        },
        {
          label: "Patient / case logs",
          done: (logCountByRotation.get(r.id) ?? 0) > 0,
          actionLabel: "Log a case →",
          actionHref: "/student/log/new",
        },
        {
          label: "Evaluation",
          done: hasSubmittedEvaluation,
          actionLabel: "View evaluation →",
          actionHref: "/student/logbook",
        },
      ],
    };
  });
}
