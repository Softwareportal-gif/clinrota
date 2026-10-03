"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";
import { getStudentProfileByUserId } from "@/lib/student";
import { sendEmail, wardSupervisorAssignedEmailHtml } from "@/lib/email";
import { logAudit } from "@/lib/audit-log";
import { appBaseUrl } from "@/lib/app-url";
import type { CreateWardAssignmentPayload, EndWardAssignmentPayload } from "@/lib/offline/payloads";

export type CoreResult = { error?: string; ok?: true };

// Upsert-safe like createLogEntryCore, for the same reason — a queued
// offline write replaying after it already landed must be a no-op, not a
// unique-constraint error against the "one active assignment" index.
export async function createWardAssignmentCore(payload: CreateWardAssignmentPayload): Promise<CoreResult> {
  const session = await requireRole("STUDENT");
  const studentProfile = await getStudentProfileByUserId(session.user.id);

  const wardName = payload.wardName?.trim();
  if (!payload.rotationId || !wardName || !payload.wardSupervisorId) {
    return { error: "Check the form and try again." };
  }

  const rotation = await prisma.rotation.findFirst({
    where: { id: payload.rotationId, studentId: studentProfile.id, status: "ACTIVE" },
    include: { clinicalSite: true },
  });
  if (!rotation) return { error: "That rotation is not available." };
  if (!rotation.clinicalSite.wardSupervisionEnabled) {
    return { error: "This site does not use ward supervision." };
  }

  const eligible = await prisma.wardSupervisorEligibility.findUnique({
    where: {
      clinicalSiteId_supervisorProfileId: {
        clinicalSiteId: rotation.clinicalSiteId,
        supervisorProfileId: payload.wardSupervisorId,
      },
    },
    include: { supervisorProfile: { include: { user: true } } },
  });
  if (!eligible) return { error: "Select a ward supervisor from the list." };

  const existing = await prisma.wardAssignment.findUnique({ where: { id: payload.id } });
  if (existing) return { ok: true };

  const active = await prisma.wardAssignment.findFirst({
    where: { rotationId: rotation.id, endedAt: null },
  });
  if (active) return { ok: true }; // already have one — nothing left to do

  const wardAssignment = await prisma.wardAssignment.create({
    data: {
      id: payload.id,
      rotationId: rotation.id,
      wardName,
      wardSupervisorId: payload.wardSupervisorId,
    },
  });

  const studentUser = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });

  await logAudit({
    actorId: session.user.id,
    action: "WARD_ASSIGNMENT_CREATED",
    entityType: "WardAssignment",
    entityId: wardAssignment.id,
    afterData: { rotationId: rotation.id, wardName, wardSupervisorId: payload.wardSupervisorId },
  });

  await prisma.notification.create({
    data: {
      userId: eligible.supervisorProfile.userId,
      type: "WARD_ASSIGNED",
      title: "You've been assigned as a ward supervisor",
      body: `${studentUser.name} started logging cases on ${wardName} with you as ward supervisor.`,
      relatedEntityType: "WardAssignment",
      relatedEntityId: wardAssignment.id,
    },
  });

  // Best-effort — a failed email must not undo the assignment itself, same
  // tradeoff as the review-decision notification (in-app row always lands).
  const loginUrl = `${appBaseUrl()}/login`;
  await sendEmail({
    to: eligible.supervisorProfile.user.email,
    subject: "You've been assigned as a ward supervisor",
    html: wardSupervisorAssignedEmailHtml({
      supervisorName: eligible.supervisorProfile.user.name,
      studentName: studentUser.name,
      wardName,
      clinicalSiteName: rotation.clinicalSite.name,
      loginUrl,
    }),
  });

  revalidatePath("/student/log/new");
  return { ok: true };
}

// Ends the active assignment (the only way it changes, per spec) so the
// mandatory ward-selection step reopens on the student's next entry.
export async function endWardAssignmentCore(payload: EndWardAssignmentPayload): Promise<CoreResult> {
  const session = await requireRole("STUDENT");
  const studentProfile = await getStudentProfileByUserId(session.user.id);

  const assignment = await prisma.wardAssignment.findFirst({
    where: { id: payload.wardAssignmentId, rotation: { studentId: studentProfile.id } },
  });
  if (!assignment) return { error: "That ward assignment was not found." };
  if (assignment.endedAt) return { ok: true }; // already ended — replay-safe no-op

  const endedAt = new Date();
  await prisma.wardAssignment.update({
    where: { id: assignment.id },
    data: { endedAt },
  });

  await logAudit({
    actorId: session.user.id,
    action: "WARD_ASSIGNMENT_ENDED",
    entityType: "WardAssignment",
    entityId: assignment.id,
    afterData: { endedAt: endedAt.toISOString() },
  });

  revalidatePath("/student/log/new");
  return { ok: true };
}
