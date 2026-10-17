import { prisma } from "@/lib/prisma";
import { getStudentCoverage, type StudentCoverageSummary } from "@/lib/student-coverage";
import { getRotationHours, type RotationHours } from "@/lib/rotation-hours";
import { parseRubric, rubricPercent } from "@/lib/discipline-template";
import { getEffectiveDocStatus, type EffectiveDocStatus } from "@/lib/compliance-status";
import type { LogEntryStatus } from "@/generated/prisma/client";

export type RotationWithDetails = Awaited<ReturnType<typeof loadRotations>>[number];

async function loadRotations(studentId: string) {
  return prisma.rotation.findMany({
    where: { studentId },
    include: {
      clinicalSite: true,
      siteDepartment: true,
      supervisor: { include: { user: true } },
      program: { select: { defaultMinHours: true, disciplineTemplate: true } },
      rotationScore: { include: { overriddenBy: true } },
      competencyEvaluations: { include: { ratings: true } },
    },
    orderBy: { startDate: "desc" },
  });
}

export type ComplianceItem = {
  requiredDocumentTypeId: string;
  name: string;
  status: EffectiveDocStatus;
  expiryDate: Date | null;
};

export type StudentRecordData = {
  student: NonNullable<Awaited<ReturnType<typeof loadStudent>>>;
  rotations: (RotationWithDetails & {
    hours: RotationHours;
    evaluationPercent: number | null;
  })[];
  logbookCounts: Record<LogEntryStatus, number>;
  totalLogEntries: number;
  coverage: StudentCoverageSummary;
  compliance: ComplianceItem[];
};

async function loadStudent(studentId: string) {
  return prisma.studentProfile.findUnique({
    where: { id: studentId },
    include: { user: true, program: true, cohort: true },
  });
}

const LOG_ENTRY_STATUSES: LogEntryStatus[] = [
  "DRAFT",
  "SUBMITTED",
  "APPROVED",
  "REJECTED",
  "NEEDS_REVISION",
];

// Everything the Unified Student Record page (and the per-student PDF
// export, which reuses the exact same sections) needs, fetched together so
// both call sites stay in sync rather than re-deriving this independently.
export async function getStudentRecordData(studentId: string): Promise<StudentRecordData | null> {
  const student = await loadStudent(studentId);
  if (!student) return null;

  // Sequential, not Promise.all — concurrent queries against the local dev
  // database have exhausted its connection pool before (see the same
  // rationale in src/lib/offline/sync.ts), and this aggregator already runs
  // enough queries that it's worth avoiding the risk here too.
  const rotationsRaw = await loadRotations(studentId);
  const logEntryGroups = await prisma.logEntry.groupBy({
    by: ["status"],
    where: { studentId },
    _count: { _all: true },
  });
  const coverage = await getStudentCoverage(studentId, student.programId);
  const requiredTypes = await prisma.requiredDocumentType.findMany({
    where: { programId: student.programId, isActive: true },
    orderBy: { name: "asc" },
  });
  const documents = await prisma.complianceDocument.findMany({ where: { studentId } });

  const rotations = [];
  for (const rotation of rotationsRaw) {
    const rubric = parseRubric(rotation.program.disciplineTemplate.rubric);
    rotations.push({
      ...rotation,
      hours: await getRotationHours(rotation),
      evaluationPercent: rubricPercent(
        rotation.competencyEvaluations.find((e) => e.status === "SUBMITTED")?.ratings ?? [],
        rubric
      ),
    });
  }

  const logbookCounts = Object.fromEntries(
    LOG_ENTRY_STATUSES.map((status) => [
      status,
      logEntryGroups.find((g) => g.status === status)?._count._all ?? 0,
    ])
  ) as Record<LogEntryStatus, number>;
  const totalLogEntries = Object.values(logbookCounts).reduce((a, b) => a + b, 0);

  const docByType = new Map(documents.map((d) => [d.requiredDocumentTypeId, d]));
  const compliance: ComplianceItem[] = requiredTypes.map((type) => {
    const doc = docByType.get(type.id);
    return {
      requiredDocumentTypeId: type.id,
      name: type.name,
      status: getEffectiveDocStatus(doc),
      expiryDate: doc?.expiryDate ?? null,
    };
  });

  return {
    student,
    rotations,
    logbookCounts,
    totalLogEntries,
    coverage,
    compliance,
  };
}
