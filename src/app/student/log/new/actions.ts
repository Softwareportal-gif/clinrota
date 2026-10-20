"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";
import { getStudentProfileByUserId } from "@/lib/student";
import type { CreateLogEntryPayload } from "@/lib/offline/payloads";
import { normalizeWardName } from "@/lib/ward";
import { loggableRotationWhere } from "@/lib/rotation-status";

export type CoreResult = { error?: string; ok?: true };

// Upsert, not create — replaying an already-synced "create-log-entry" (a
// sync firing twice, or a page reload before the queue item was marked
// synced) is a safe no-op rather than a unique-constraint error.
export async function createLogEntryCore(payload: CreateLogEntryPayload): Promise<CoreResult> {
  const session = await requireRole("STUDENT");
  const studentProfile = await getStudentProfileByUserId(session.user.id);

  if (!payload.rotationId || !payload.competencyId || !payload.caseTitle?.trim() || !payload.studentRole) {
    return { error: "Check the form and try again." };
  }

  const rotation = await prisma.rotation.findFirst({
    where: { id: payload.rotationId, studentId: studentProfile.id, ...loggableRotationWhere() },
    include: { clinicalSite: true },
  });
  if (!rotation) return { error: "That rotation is not available." };

  const competency = await prisma.competency.findFirst({
    where: { id: payload.competencyId, programId: studentProfile.programId },
  });
  if (!competency) return { error: "That case category is not available." };

  const occurredAt = new Date(payload.occurredAt);
  if (Number.isNaN(occurredAt.getTime())) return { error: "Invalid case date." };

  // Never trust the client's payload for this — re-derive the rotation's
  // currently-active WardAssignment server-side. A site that requires ward
  // supervision but has none active yet (student skipped the step, or it
  // ended between page load and submit) blocks entry creation entirely.
  let wardAssignmentId: string | null = null;
  let assignedWard: string | null = null;
  if (rotation.clinicalSite.wardSupervisionEnabled) {
    const active = await prisma.wardAssignment.findFirst({
      where: { rotationId: rotation.id, endedAt: null },
    });
    if (!active) {
      return { error: "Select a ward and ward supervisor before logging a case here." };
    }
    wardAssignmentId = active.id;
    assignedWard = active.wardName;
  }
  // Under ward supervision the ward is the active assignment's; otherwise
  // it's the one the student chose first in the form.
  const wardName = assignedWard ?? normalizeWardName(payload.wardName);

  await prisma.logEntry.upsert({
    where: { id: payload.id },
    create: {
      id: payload.id,
      studentId: studentProfile.id,
      rotationId: rotation.id,
      caseTitle: payload.caseTitle.trim(),
      studentRole: payload.studentRole,
      occurredAt,
      subjective: "",
      objectiveFindings: "",
      assessment: "",
      plan: "",
      wardAssignmentId,
      wardName,
      competencies: { create: [{ competencyId: competency.id }] },
    },
    update: {},
  });

  revalidatePath("/student/logbook");
  return { ok: true };
}
