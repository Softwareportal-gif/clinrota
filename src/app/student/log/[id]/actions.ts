"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";
import { getStudentProfileByUserId } from "@/lib/student";
import { EDITABLE_STATUSES, VITAL_RANGES } from "@/lib/log-entry-constants";
import type { SaveLogStepPayload } from "@/lib/offline/payloads";

export type CoreResult = { error?: string; ok?: true };

// Guards every step: only the owning student may edit their own entry, and
// only while it's in an editable status (draft / rejected / needs revision).
// Plain `update()` calls below are naturally idempotent, so replaying an
// already-applied step twice (e.g. a sync firing twice) just re-writes the
// same values — a safe no-op, not an error or a duplicate.
async function authorizeEdit(logEntryId: string) {
  const session = await requireRole("STUDENT");
  const studentProfile = await getStudentProfileByUserId(session.user.id);
  const entry = await prisma.logEntry.findUnique({ where: { id: logEntryId } });
  if (!entry || entry.studentId !== studentProfile.id) {
    return { error: "Log entry not found." } as const;
  }
  if (!EDITABLE_STATUSES.includes(entry.status)) {
    return { error: "This entry can no longer be edited." } as const;
  }
  return { session, entry } as const;
}

type VitalKey = keyof typeof VITAL_RANGES;

function parseVital(value: number | null, key: VitalKey): number | null {
  if (value === null) return null;
  const range = VITAL_RANGES[key];
  if (Number.isNaN(value) || value < range.min || value > range.max) {
    throw new Error(`${range.label} must be between ${range.min} and ${range.max}.`);
  }
  return value;
}

export async function saveLogStepCore(payload: SaveLogStepPayload): Promise<CoreResult> {
  const auth = await authorizeEdit(payload.logEntryId);
  if ("error" in auth) return auth;

  if (payload.step === "subjective") {
    if (payload.subjective.trim().length < 10) {
      return { error: "Add a bit more detail (at least 10 characters)." };
    }
    await prisma.logEntry.update({
      where: { id: payload.logEntryId },
      data: { subjective: payload.subjective.trim() },
    });
  } else if (payload.step === "objective") {
    let vitalTempC: number | null;
    let vitalBpSystolic: number | null;
    let vitalBpDiastolic: number | null;
    let vitalPulse: number | null;
    let vitalRespRate: number | null;
    let vitalSpo2: number | null;
    try {
      vitalTempC = parseVital(payload.vitalTempC, "tempC");
      vitalBpSystolic = parseVital(payload.vitalBpSystolic, "bpSystolic");
      vitalBpDiastolic = parseVital(payload.vitalBpDiastolic, "bpDiastolic");
      vitalPulse = parseVital(payload.vitalPulse, "pulse");
      vitalRespRate = parseVital(payload.vitalRespRate, "respRate");
      vitalSpo2 = parseVital(payload.vitalSpo2, "spo2");
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Check the vitals entered." };
    }
    if (payload.objectiveFindings.trim().length < 5) {
      return { error: "Add at least a brief note on other findings." };
    }
    await prisma.logEntry.update({
      where: { id: payload.logEntryId },
      data: {
        vitalTempC,
        vitalBpSystolic,
        vitalBpDiastolic,
        vitalPulse,
        vitalRespRate,
        vitalSpo2,
        objectiveFindings: payload.objectiveFindings.trim(),
      },
    });
  } else if (payload.step === "assessment") {
    if (payload.assessment.trim().length < 10) {
      return { error: "Add a bit more detail (at least 10 characters)." };
    }
    await prisma.logEntry.update({
      where: { id: payload.logEntryId },
      data: { assessment: payload.assessment.trim() },
    });
  } else if (payload.step === "plan") {
    if (payload.plan.trim().length < 10) {
      return { error: "Add a bit more detail (at least 10 characters)." };
    }

    if (payload.intent === "submit") {
      const updated = await prisma.logEntry.update({
        where: { id: payload.logEntryId },
        data: {
          plan: payload.plan.trim(),
          extraFields: payload.extraFields ?? undefined,
          status: "SUBMITTED",
          submittedAt: new Date(),
        },
        include: { rotation: { include: { supervisor: { include: { user: true } } } } },
      });
      // Replaying this step twice would otherwise send a duplicate
      // notification — only send it the first time status actually flips.
      if (auth.entry.status !== "SUBMITTED") {
        await prisma.notification.create({
          data: {
            userId: updated.rotation.supervisor.user.id,
            type: "PENDING_REVIEW",
            title: "New entry awaiting your review",
            body: `${auth.session.user.name} submitted a new case: ${updated.caseTitle}.`,
            relatedEntityType: "LogEntry",
            relatedEntityId: updated.id,
          },
        });
      }
    } else {
      await prisma.logEntry.update({
        where: { id: payload.logEntryId },
        data: { plan: payload.plan.trim(), extraFields: payload.extraFields ?? undefined },
      });
    }
  }

  revalidatePath("/student/logbook");
  revalidatePath(`/student/log/${payload.logEntryId}`);
  return { ok: true };
}

// A student may delete their own case while it's still a draft (never
// submitted), e.g. one started by mistake. Anything already submitted stays.
export async function deleteDraftEntry(logEntryId: string): Promise<void> {
  const session = await requireRole("STUDENT");
  const studentProfile = await getStudentProfileByUserId(session.user.id);
  await prisma.logEntry.deleteMany({ where: { id: logEntryId, studentId: studentProfile.id, status: "DRAFT" } });
  revalidatePath("/student/logbook");
  redirect("/student/logbook");
}
