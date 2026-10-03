"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/require-role";
import { getStudentProfileByUserId } from "@/lib/student";
import { prisma } from "@/lib/prisma";
import { isCycleLocked } from "@/lib/preference-cycle";

export type ActionResult = { error?: string; ok?: true };

async function loadOpenCycleOrThrow(cycleId: string, studentId: string) {
  const cycle = await prisma.preferenceCycle.findUnique({ where: { id: cycleId } });
  if (!cycle) throw new Error("That preference cycle was not found.");
  const submission = await prisma.preferenceSubmission.findUnique({
    where: { cycleId_studentId: { cycleId, studentId } },
  });
  if (submission) throw new Error("You've already submitted your preferences for this cycle.");
  if (isCycleLocked(cycle)) throw new Error("This preference cycle is closed.");
  return cycle;
}

export async function addPreference(
  cycleId: string,
  clinicalSiteId: string,
  _prevState: ActionResult | undefined,
  _formData: FormData
): Promise<ActionResult> {
  const session = await requireRole("STUDENT");
  const studentProfile = await getStudentProfileByUserId(session.user.id);

  try {
    const cycle = await loadOpenCycleOrThrow(cycleId, studentProfile.id);

    const existing = await prisma.rotationPreference.findMany({
      where: { cycleId, studentId: studentProfile.id },
      orderBy: { rank: "desc" },
    });
    if (existing.some((p) => p.clinicalSiteId === clinicalSiteId)) {
      return { error: "That site is already on your list." };
    }
    if (existing.length >= cycle.maxSelections) {
      return { error: `You can shortlist at most ${cycle.maxSelections} sites.` };
    }

    await prisma.rotationPreference.create({
      data: {
        cycleId,
        studentId: studentProfile.id,
        clinicalSiteId,
        rank: (existing[0]?.rank ?? 0) + 1,
      },
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Something went wrong." };
  }

  revalidatePath("/student");
  return { ok: true };
}

export async function removePreference(preferenceId: string): Promise<ActionResult> {
  const session = await requireRole("STUDENT");
  const studentProfile = await getStudentProfileByUserId(session.user.id);

  const pref = await prisma.rotationPreference.findUnique({ where: { id: preferenceId } });
  if (!pref || pref.studentId !== studentProfile.id) {
    return { error: "That preference was not found." };
  }

  try {
    await loadOpenCycleOrThrow(pref.cycleId, studentProfile.id);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Something went wrong." };
  }

  await prisma.rotationPreference.delete({ where: { id: preferenceId } });
  revalidatePath("/student");
  return { ok: true };
}

// Swaps rank with the preference immediately above/below it. Ranks go
// through a sentinel value mid-transaction because the DB has a real
// unique constraint on (cycleId, studentId, rank) — swapping two rows'
// ranks directly would transiently collide (A takes B's old rank while B
// still holds it), so A parks on a rank nothing else uses first.
export async function movePreference(
  preferenceId: string,
  direction: "up" | "down"
): Promise<ActionResult> {
  const session = await requireRole("STUDENT");
  const studentProfile = await getStudentProfileByUserId(session.user.id);

  const pref = await prisma.rotationPreference.findUnique({ where: { id: preferenceId } });
  if (!pref || pref.studentId !== studentProfile.id) {
    return { error: "That preference was not found." };
  }

  try {
    await loadOpenCycleOrThrow(pref.cycleId, studentProfile.id);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Something went wrong." };
  }

  const ordered = await prisma.rotationPreference.findMany({
    where: { cycleId: pref.cycleId, studentId: studentProfile.id },
    orderBy: { rank: "asc" },
  });
  const idx = ordered.findIndex((p) => p.id === preferenceId);
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (idx === -1 || swapIdx < 0 || swapIdx >= ordered.length) return { ok: true };

  const a = ordered[idx];
  const b = ordered[swapIdx];
  await prisma.$transaction([
    prisma.rotationPreference.update({ where: { id: a.id }, data: { rank: -1 } }),
    prisma.rotationPreference.update({ where: { id: b.id }, data: { rank: a.rank } }),
    prisma.rotationPreference.update({ where: { id: a.id }, data: { rank: b.rank } }),
  ]);

  revalidatePath("/student");
  return { ok: true };
}

export async function submitPreferences(cycleId: string): Promise<ActionResult> {
  const session = await requireRole("STUDENT");
  const studentProfile = await getStudentProfileByUserId(session.user.id);

  const cycle = await prisma.preferenceCycle.findUnique({ where: { id: cycleId } });
  if (!cycle) return { error: "That preference cycle was not found." };
  if (isCycleLocked(cycle)) return { error: "This preference cycle is closed." };

  const count = await prisma.rotationPreference.count({
    where: { cycleId, studentId: studentProfile.id },
  });
  if (count < cycle.minSelections) {
    return { error: `Shortlist at least ${cycle.minSelections} sites before submitting.` };
  }

  await prisma.preferenceSubmission.upsert({
    where: { cycleId_studentId: { cycleId, studentId: studentProfile.id } },
    create: { cycleId, studentId: studentProfile.id },
    update: {},
  });

  revalidatePath("/student");
  return { ok: true };
}
