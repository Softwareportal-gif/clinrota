"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";
import { getCoordinatorProfileByUserId } from "@/lib/coordinator";
import { getEffectiveDocStatus, isCompliant } from "@/lib/compliance-status";
import { getSiteContractStatus, isSiteContractIssue } from "@/lib/site-status";
import { logAudit } from "@/lib/audit-log";
import { statusForNewRotation } from "@/lib/rotation-status";

export type AssignState = { error?: string } | undefined;

// A generous ceiling on one submission — a whole year level, not a whole
// institution.
const MAX_STUDENTS_PER_ASSIGNMENT = 500;

const schema = z.object({
  studentIds: z
    .array(z.string().min(1))
    .min(1, "Select at least one student.")
    .max(MAX_STUDENTS_PER_ASSIGNMENT, `Assign at most ${MAX_STUDENTS_PER_ASSIGNMENT} students at a time.`),
  clinicalSiteId: z.string().min(1, "Select a clinical site."),
  siteDepartmentId: z.string().optional(),
  supervisorId: z.string().min(1, "Select a supervisor."),
  startDate: z.string().min(1, "Enter a start date."),
  endDate: z.string().min(1, "Enter an end date."),
});

// Gives every selected student the same placement (site, supervisor and
// dates) — one student or a whole year level in a single submission.
export async function assignRotations(_prevState: AssignState, formData: FormData): Promise<AssignState> {
  const session = await requireRole("COORDINATOR");
  const coordinatorProfile = await getCoordinatorProfileByUserId(session.user.id);

  const parsed = schema.safeParse({
    studentIds: [...new Set(formData.getAll("studentIds").map(String))],
    clinicalSiteId: formData.get("clinicalSiteId"),
    siteDepartmentId: formData.get("siteDepartmentId") || undefined,
    supervisorId: formData.get("supervisorId"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }
  const { studentIds } = parsed.data;
  const startDate = new Date(parsed.data.startDate);
  const endDate = new Date(parsed.data.endDate);
  if (endDate < startDate) return { error: "The end date must be on or after the start date." };

  // Every selected student must be in this coordinator's program, whatever
  // ids the client sent.
  const students = await prisma.studentProfile.findMany({
    where: { id: { in: studentIds }, programId: coordinatorProfile.programId },
    include: { user: { select: { name: true } } },
  });
  if (students.length !== studentIds.length) return { error: "Some selected students weren't found." };

  const site = await prisma.clinicalSite.findUnique({ where: { id: parsed.data.clinicalSiteId } });
  if (!site || site.institutionId !== coordinatorProfile.program.institutionId) {
    return { error: "Clinical site not found." };
  }
  if (parsed.data.siteDepartmentId) {
    const department = await prisma.siteDepartment.findFirst({
      where: { id: parsed.data.siteDepartmentId, clinicalSiteId: site.id },
    });
    if (!department) return { error: "That department isn't part of the selected site." };
  }

  const supervisor = await prisma.supervisorProfile.findFirst({
    where: { id: parsed.data.supervisorId, user: { institutionId: coordinatorProfile.program.institutionId } },
  });
  if (!supervisor) return { error: "Supervisor not found." };

  // Server-side re-verification of any warnings — the client-side banner is
  // a convenience, never the source of truth for whether to log an override.
  const [requiredTypes, docs] = await Promise.all([
    prisma.requiredDocumentType.findMany({ where: { programId: coordinatorProfile.programId, isActive: true } }),
    prisma.complianceDocument.findMany({ where: { studentId: { in: studentIds } } }),
  ]);
  const docByStudentType = new Map(docs.map((d) => [`${d.studentId}:${d.requiredDocumentTypeId}`, d]));
  const nonCompliantTypesByStudent = new Map(
    students.map((s) => [
      s.id,
      requiredTypes
        .filter((t) => !isCompliant(getEffectiveDocStatus(docByStudentType.get(`${s.id}:${t.id}`))))
        .map((t) => t.name),
    ])
  );
  const siteStatus = getSiteContractStatus(site);
  const siteHasIssue = isSiteContractIssue(siteStatus);
  const hasWarning = siteHasIssue || [...nonCompliantTypesByStudent.values()].some((types) => types.length > 0);

  const acknowledged = formData.get("acknowledgeWarning") === "on";
  const overrideReason = String(formData.get("overrideReason") ?? "").trim();
  if (hasWarning && !acknowledged) {
    return { error: "Some students or the site have an outstanding issue. Check the box below to proceed anyway." };
  }
  if (hasWarning && !overrideReason) {
    return { error: "Enter a reason for proceeding despite the warning." };
  }

  // All or nothing, so a failure partway never leaves half a year level
  // placed. Sequential creates for the connection-pool reason noted
  // elsewhere in this codebase.
  const rotations = await prisma.$transaction(async (tx) => {
    const created = [];
    for (const student of students) {
      created.push(
        await tx.rotation.create({
          data: {
            studentId: student.id,
            programId: coordinatorProfile.programId,
            cohortId: student.cohortId,
            clinicalSiteId: site.id,
            siteDepartmentId: parsed.data.siteDepartmentId || null,
            supervisorId: supervisor.id,
            startDate,
            endDate,
            status: statusForNewRotation(startDate),
          },
        })
      );
    }
    return created;
  });

  for (const rotation of rotations) {
    const nonCompliantTypes = nonCompliantTypesByStudent.get(rotation.studentId) ?? [];
    if (siteHasIssue || nonCompliantTypes.length > 0) {
      await logAudit({
        actorId: session.user.id,
        action: "ROTATION_ASSIGNED_DESPITE_WARNING",
        entityType: "Rotation",
        entityId: rotation.id,
        afterData: { nonCompliantDocumentTypes: nonCompliantTypes, siteContractStatus: siteStatus, overrideReason },
      });
    }
  }

  redirect(`/coordinator?assigned=${rotations.length}`);
}
