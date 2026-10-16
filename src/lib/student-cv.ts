import { prisma } from "@/lib/prisma";
import { ENTRUSTMENT_LEVEL_VALUE } from "@/lib/entrustment";
import type { EntrustmentLevel } from "@/generated/prisma/client";

// Short, employer-readable wording for the entrustment scale.
export const CV_LEVEL_LABELS: Record<EntrustmentLevel, string> = {
  OBSERVATION_ONLY: "Observed",
  DIRECT_SUPERVISION: "Under direct supervision",
  INDIRECT_SUPERVISION: "Under indirect supervision",
  UNSUPERVISED: "Independently",
  SUPERVISING_OTHERS: "While supervising others",
};

export type CvPlacement = {
  id: string;
  siteName: string;
  departmentName: string | null;
  location: string | null;
  startDate: Date;
  endDate: Date;
  isCurrent: boolean;
  preceptorName: string;
  approvedHours: number;
  approvedCases: number;
};

export type CvSkill = {
  name: string;
  approvedCases: number;
  highestLevel: EntrustmentLevel;
};

export type StudentCvData = {
  name: string;
  email: string;
  phone: string | null;
  personalStatement: string | null;
  areasOfInterest: string | null;
  programName: string;
  institutionName: string;
  cohortLabel: string | null;
  placements: CvPlacement[];
  skills: CvSkill[];
  totalApprovedHours: number;
  totalApprovedCases: number;
};

// A CV is shown to employers, so everything clinical on it is limited to what
// a supervisor has signed off: APPROVED timesheets and APPROVED log entries.
// Drafts, pending, and rejected work never appear. Compliance documents
// (immunizations, background checks) and patient case details are left out.
export async function getStudentCvData(studentProfileId: string): Promise<StudentCvData | null> {
  const student = await prisma.studentProfile.findUnique({
    where: { id: studentProfileId },
    include: { user: { include: { institution: true } }, program: true, cohort: true },
  });
  if (!student) return null;

  const rotations = await prisma.rotation.findMany({
    where: { studentId: student.id, status: { in: ["ACTIVE", "COMPLETED"] } },
    include: { clinicalSite: true, siteDepartment: true, supervisor: { include: { user: true } } },
    orderBy: { startDate: "desc" },
  });
  const rotationIds = rotations.map((r) => r.id);

  const [hourGroups, caseGroups, skillLinks] = await Promise.all([
    prisma.timesheetEntry.groupBy({
      by: ["rotationId"],
      where: { studentId: student.id, rotationId: { in: rotationIds }, status: "APPROVED" },
      _sum: { hours: true },
    }),
    prisma.logEntry.groupBy({
      by: ["rotationId"],
      where: { studentId: student.id, rotationId: { in: rotationIds }, status: "APPROVED" },
      _count: { _all: true },
    }),
    prisma.logEntryCompetency.findMany({
      where: { logEntry: { studentId: student.id, status: "APPROVED" } },
      include: {
        competency: { select: { name: true } },
        logEntry: { select: { studentRole: true, supervisorAssessedRole: true } },
      },
    }),
  ]);

  const hoursByRotation = new Map(hourGroups.map((g) => [g.rotationId, g._sum.hours ?? 0]));
  const casesByRotation = new Map(caseGroups.map((g) => [g.rotationId, g._count._all]));

  const placements: CvPlacement[] = rotations.map((r) => ({
    id: r.id,
    siteName: r.clinicalSite.name,
    departmentName: r.siteDepartment?.name ?? null,
    location: r.clinicalSite.location,
    startDate: r.startDate,
    endDate: r.endDate,
    isCurrent: r.status === "ACTIVE",
    preceptorName: r.supervisor.user.name,
    approvedHours: hoursByRotation.get(r.id) ?? 0,
    approvedCases: casesByRotation.get(r.id) ?? 0,
  }));

  // Same "highest level wins, supervisor's assessment over self-report" rule
  // as competency coverage (src/lib/student-coverage.ts).
  const skillsByName = new Map<string, CvSkill>();
  for (const link of skillLinks) {
    const level = link.logEntry.supervisorAssessedRole ?? link.logEntry.studentRole;
    const existing = skillsByName.get(link.competency.name);
    if (!existing) {
      skillsByName.set(link.competency.name, { name: link.competency.name, approvedCases: 1, highestLevel: level });
    } else {
      existing.approvedCases += 1;
      if (ENTRUSTMENT_LEVEL_VALUE[level] > ENTRUSTMENT_LEVEL_VALUE[existing.highestLevel]) existing.highestLevel = level;
    }
  }
  const skills = [...skillsByName.values()].sort(
    (a, b) => b.approvedCases - a.approvedCases || a.name.localeCompare(b.name)
  );

  return {
    name: student.user.name,
    email: student.user.email,
    phone: student.phone,
    personalStatement: student.personalStatement,
    areasOfInterest: student.areasOfInterest,
    programName: student.program.name,
    institutionName: student.user.institution.name,
    cohortLabel: student.cohort ? `${student.cohort.name}, ${student.cohort.academicYear}` : null,
    placements,
    skills,
    totalApprovedHours: placements.reduce((sum, p) => sum + p.approvedHours, 0),
    totalApprovedCases: placements.reduce((sum, p) => sum + p.approvedCases, 0),
  };
}
