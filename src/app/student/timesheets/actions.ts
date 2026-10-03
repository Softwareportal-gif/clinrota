"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";
import { getStudentProfileByUserId } from "@/lib/student";
import type { SubmitTimesheetPayload } from "@/lib/offline/payloads";

export type CoreResult = { error?: string; ok?: true };

// Upsert by the client-generated id — replaying an already-synced
// submission is a safe no-op.
export async function submitTimesheetCore(payload: SubmitTimesheetPayload): Promise<CoreResult> {
  const session = await requireRole("STUDENT");
  const studentProfile = await getStudentProfileByUserId(session.user.id);

  const rotation = await prisma.rotation.findFirst({
    where: { id: payload.rotationId, studentId: studentProfile.id, status: "ACTIVE" },
  });
  if (!rotation) return { error: "That rotation is not available." };

  const shiftDate = new Date(payload.shiftDate);
  if (Number.isNaN(shiftDate.getTime())) return { error: "Enter a valid shift date." };

  const clockIn = payload.clockIn ? new Date(payload.clockIn) : null;
  const clockOut = payload.clockOut ? new Date(payload.clockOut) : null;

  let hours = payload.hours;
  if (clockIn && clockOut) {
    if (clockOut.getTime() <= clockIn.getTime()) {
      return { error: "Clock-out must be after clock-in." };
    }
    hours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
  }
  if (!hours || hours <= 0 || hours > 24) {
    return { error: "Enter a valid number of hours (or both clock-in and clock-out)." };
  }

  await prisma.timesheetEntry.upsert({
    where: { id: payload.id },
    create: {
      id: payload.id,
      studentId: studentProfile.id,
      rotationId: rotation.id,
      shiftDate,
      clockIn,
      clockOut,
      hours,
      notes: payload.notes,
      status: "PENDING",
    },
    update: {},
  });

  revalidatePath("/student/timesheets");
  return { ok: true };
}
