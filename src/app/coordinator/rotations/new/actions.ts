"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";
import { getCoordinatorProfileByUserId } from "@/lib/coordinator";
import { getEffectiveDocStatus, isCompliant } from "@/lib/compliance-status";
import { getSiteContractStatus, isSiteContractIssue } from "@/lib/site-status";
import { logAudit } from "@/lib/audit-log";

export type AssignState = { error?: string } | undefined;

const schema = z.object({
  studentId: z.string().min(1, "Select a student."),
  clinicalSiteId: z.string().min(1, "Select a clinical site."),
  siteDepartmentId: z.string().optional(),
  supervisorId: z.string().min(1, "Select a supervisor."),
  startDate: z.string().min(1, "Enter a start date."),
  endDate: z.string().min(1, "Enter an end date."),
});

export async function assignRotation(
  _prevState: AssignState,
  formData: FormData
): Promise<AssignState> {
  const session = await requireRole("COORDINATOR");
  const coordinatorProfile = await getCoordinatorProfileByUserId(session.user.id);

  const parsed = schema.safeParse({
    studentId: formData.get("studentId"),
    clinicalSiteId: formData.get("clinicalSiteId"),
    siteDepartmentId: formData.get("siteDepartmentId") || undefined,
    supervisorId: formData.get("supervisorId"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const student = await prisma.studentProfile.findUnique({ where: { id: parsed.data.studentId } });
  if (!student || student.programId !== coordinatorProfile.programId) {
    return { error: "Student not found." };
  }

  const site = await prisma.clinicalSite.findUnique({ where: { id: parsed.data.clinicalSiteId } });
  if (!site || site.institutionId !== coordinatorProfile.program.institutionId) {
    return { error: "Clinical site not found." };
  }

  const supervisor = await prisma.supervisorProfile.findUnique({
    where: { id: parsed.data.supervisorId },
  });
  if (!supervisor) return { error: "Supervisor not found." };

  // Server-side re-verification of any warnings — the client-side banner is
  // a convenience, never the source of truth for whether to log an override.
  const [requiredTypes, docs] = await Promise.all([
    prisma.requiredDocumentType.findMany({
      where: { programId: coordinatorProfile.programId, isActive: true },
    }),
    prisma.complianceDocument.findMany({ where: { studentId: student.id } }),
  ]);
  const docByType = new Map(docs.map((d) => [d.requiredDocumentTypeId, d]));
  const nonCompliantTypes = requiredTypes.filter(
    (t) => !isCompliant(getEffectiveDocStatus(docByType.get(t.id)))
  );
  const siteStatus = getSiteContractStatus(site);
  const hasWarning = nonCompliantTypes.length > 0 || isSiteContractIssue(siteStatus);

  const acknowledged = formData.get("acknowledgeWarning") === "on";
  const overrideReason = String(formData.get("overrideReason") ?? "").trim();

  if (hasWarning && !acknowledged) {
    return {
      error: "This student or site has an outstanding issue. Check the box below to proceed anyway.",
    };
  }
  if (hasWarning && !overrideReason) {
    return { error: "Enter a reason for proceeding despite the warning." };
  }

  const rotation = await prisma.rotation.create({
    data: {
      studentId: student.id,
      programId: coordinatorProfile.programId,
      cohortId: student.cohortId,
      clinicalSiteId: site.id,
      siteDepartmentId: parsed.data.siteDepartmentId || null,
      supervisorId: supervisor.id,
      startDate: new Date(parsed.data.startDate),
      endDate: new Date(parsed.data.endDate),
      status: "ACTIVE",
    },
  });

  if (hasWarning) {
    await logAudit({
      actorId: session.user.id,
      action: "ROTATION_ASSIGNED_DESPITE_WARNING",
      entityType: "Rotation",
      entityId: rotation.id,
      afterData: {
        nonCompliantDocumentTypes: nonCompliantTypes.map((t) => t.name),
        siteContractStatus: siteStatus,
        overrideReason,
      },
    });
  }

  redirect("/coordinator");
}
