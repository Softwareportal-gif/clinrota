import { requireRole } from "@/lib/require-role";
import { getCoordinatorProfileByUserId } from "@/lib/coordinator";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "@/components/dashboard-header";
import { getEffectiveDocStatus, isCompliant } from "@/lib/compliance-status";
import { getSiteContractStatus } from "@/lib/site-status";
import { AssignRotationForm } from "./assign-rotation-form";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Assign rotations" };

export default async function NewRotationPage() {
  const session = await requireRole("COORDINATOR");
  const coordinatorProfile = await getCoordinatorProfileByUserId(session.user.id);

  const [students, cohorts, requiredTypes, docs, sites, supervisors] = await Promise.all([
    prisma.studentProfile.findMany({
      where: { programId: coordinatorProfile.programId },
      include: { user: true, cohort: true },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.cohort.findMany({
      where: { programId: coordinatorProfile.programId },
      orderBy: [{ startDate: "desc" }, { name: "asc" }],
    }),
    prisma.requiredDocumentType.findMany({
      where: { programId: coordinatorProfile.programId, isActive: true },
    }),
    prisma.complianceDocument.findMany({
      where: { student: { programId: coordinatorProfile.programId } },
    }),
    prisma.clinicalSite.findMany({
      where: { institutionId: coordinatorProfile.program.institutionId },
      include: { departments: true },
      orderBy: { name: "asc" },
    }),
    prisma.supervisorProfile.findMany({
      where: { user: { institutionId: coordinatorProfile.program.institutionId } },
      include: { user: true },
      orderBy: { user: { name: "asc" } },
    }),
  ]);

  const docByStudentType = new Map(docs.map((d) => [`${d.studentId}:${d.requiredDocumentTypeId}`, d]));

  const studentRows = students.map((s) => {
    const issueTypeNames = requiredTypes
      .filter((t) => !isCompliant(getEffectiveDocStatus(docByStudentType.get(`${s.id}:${t.id}`))))
      .map((t) => t.name);
    return {
      id: s.id,
      name: s.user.name,
      studentIdNumber: s.studentIdNumber,
      cohortId: s.cohortId,
      cohortName: s.cohort?.name ?? null,
      hasIssue: issueTypeNames.length > 0,
      issueTypeNames,
    };
  });

  const siteRows = sites.map((s) => ({
    id: s.id,
    name: s.name,
    status: getSiteContractStatus(s),
    departments: s.departments.map((d) => ({ id: d.id, name: d.name })),
  }));

  const supervisorRows = supervisors.map((s) => ({ id: s.id, name: s.user.name }));

  return (
    <main className="min-h-screen bg-gray-50">
      <DashboardHeader title="Assign rotations" />
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-8 sm:px-6">
        <p className="text-sm text-gray-600">
          Choose one student or a whole level, then the placement they share. Each student gets their own
          rotation with the same site, supervisor and dates.
        </p>
        {studentRows.length === 0 ? (
          <p className="text-sm text-gray-500">No students in this program yet.</p>
        ) : (
          <AssignRotationForm
            students={studentRows}
            cohorts={cohorts.map((c) => ({ id: c.id, label: `${c.name} · ${c.academicYear} ${c.term}` }))}
            sites={siteRows}
            supervisors={supervisorRows}
          />
        )}
      </div>
    </main>
  );
}
