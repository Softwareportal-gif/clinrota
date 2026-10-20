"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";
import { getCoordinatorProfileByUserId } from "@/lib/coordinator";
import { logAudit } from "@/lib/audit-log";
import { statusForNewRotation } from "@/lib/rotation-status";

export type RotationEditState = { error?: string; done?: string } | undefined;

// The rotation, only if it belongs to this coordinator's program.
async function ownRotation(rotationId: string) {
  const session = await requireRole("COORDINATOR");
  const coordinatorProfile = await getCoordinatorProfileByUserId(session.user.id);
  const rotation = await prisma.rotation.findFirst({
    where: { id: rotationId, programId: coordinatorProfile.programId },
  });
  return { session, coordinatorProfile, rotation };
}

function refresh(rotationId: string) {
  revalidatePath("/coordinator/rotations");
  revalidatePath(`/coordinator/rotations/${rotationId}`);
  revalidatePath("/coordinator");
}

const editSchema = z.object({
  supervisorId: z.string().min(1, "Select a supervisor."),
  siteDepartmentId: z.string().optional(),
  startDate: z.string().min(1, "Enter a start date."),
  endDate: z.string().min(1, "Enter an end date."),
});

// Change the supervisor, ward or dates: the wrong supervisor was picked, or
// the placement moved. A cancelled rotation stays cancelled.
export async function updateRotation(rotationId: string, _prev: RotationEditState, formData: FormData): Promise<RotationEditState> {
  const { session, coordinatorProfile, rotation } = await ownRotation(rotationId);
  if (!rotation) return { error: "Rotation not found." };

  const parsed = editSchema.safeParse({
    supervisorId: formData.get("supervisorId"),
    siteDepartmentId: formData.get("siteDepartmentId") || undefined,
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  const startDate = new Date(parsed.data.startDate);
  const endDate = new Date(parsed.data.endDate);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return { error: "Enter valid dates." };
  if (endDate < startDate) return { error: "The end date must be on or after the start date." };

  const supervisor = await prisma.supervisorProfile.findFirst({
    where: { id: parsed.data.supervisorId, user: { institutionId: coordinatorProfile.program.institutionId } },
  });
  if (!supervisor) return { error: "Supervisor not found." };
  if (parsed.data.siteDepartmentId) {
    const department = await prisma.siteDepartment.findFirst({
      where: { id: parsed.data.siteDepartmentId, clinicalSiteId: rotation.clinicalSiteId },
    });
    if (!department) return { error: "That ward isn't part of this rotation's site." };
  }

  const updated = await prisma.rotation.update({
    where: { id: rotation.id },
    data: {
      supervisorId: supervisor.id,
      siteDepartmentId: parsed.data.siteDepartmentId ?? null,
      startDate,
      endDate,
      // New dates decide the state again, unless it was cancelled.
      status: rotation.status === "CANCELLED" ? "CANCELLED" : statusForNewRotation(startDate),
    },
  });
  await logAudit({
    actorId: session.user.id,
    action: "ROTATION_UPDATED",
    entityType: "Rotation",
    entityId: rotation.id,
    afterData: {
      before: { supervisorId: rotation.supervisorId, siteDepartmentId: rotation.siteDepartmentId, startDate: rotation.startDate, endDate: rotation.endDate },
      after: { supervisorId: updated.supervisorId, siteDepartmentId: updated.siteDepartmentId, startDate: updated.startDate, endDate: updated.endDate },
    },
  });
  refresh(rotation.id);
  return { done: "Rotation updated." };
}

// End a rotation today: the student left early, or the placement finished sooner.
export async function endRotationNow(rotationId: string): Promise<void> {
  const { session, rotation } = await ownRotation(rotationId);
  if (!rotation || rotation.status === "CANCELLED") return;
  const today = new Date(new Date().toISOString().slice(0, 10));
  const endDate = today < rotation.startDate ? rotation.startDate : today;
  await prisma.rotation.update({ where: { id: rotation.id }, data: { status: "COMPLETED", endDate } });
  await logAudit({
    actorId: session.user.id,
    action: "ROTATION_ENDED_EARLY",
    entityType: "Rotation",
    entityId: rotation.id,
    afterData: { previousEndDate: rotation.endDate, endDate },
  });
  refresh(rotation.id);
}

export async function cancelRotation(rotationId: string): Promise<void> {
  const { session, rotation } = await ownRotation(rotationId);
  if (!rotation || rotation.status === "CANCELLED") return;
  await prisma.rotation.update({ where: { id: rotation.id }, data: { status: "CANCELLED" } });
  await logAudit({
    actorId: session.user.id,
    action: "ROTATION_CANCELLED",
    entityType: "Rotation",
    entityId: rotation.id,
    afterData: { previousStatus: rotation.status },
  });
  refresh(rotation.id);
}

// Undo a cancel: the dates decide the state again. (An early end is undone
// by editing the end date.)
export async function restoreRotation(rotationId: string): Promise<void> {
  const { session, rotation } = await ownRotation(rotationId);
  if (!rotation || rotation.status !== "CANCELLED") return;
  await prisma.rotation.update({ where: { id: rotation.id }, data: { status: statusForNewRotation(rotation.startDate) } });
  await logAudit({
    actorId: session.user.id,
    action: "ROTATION_RESTORED",
    entityType: "Rotation",
    entityId: rotation.id,
    afterData: { previousStatus: rotation.status },
  });
  refresh(rotation.id);
}
