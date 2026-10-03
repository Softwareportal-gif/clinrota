"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";
import { getCoordinatorProfileByUserId } from "@/lib/coordinator";

export type SettingsState = { error?: string; success?: boolean } | undefined;

const schema = z.object({
  supervisorWeightPercent: z.coerce.number().min(0).max(100),
  logbookWeightPercent: z.coerce.number().min(0).max(100),
  passThreshold: z.coerce.number().min(0).max(100),
});

export async function saveScoringConfig(
  _prevState: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const session = await requireRole("COORDINATOR");
  const coordinatorProfile = await getCoordinatorProfileByUserId(session.user.id);

  const parsed = schema.safeParse({
    supervisorWeightPercent: formData.get("supervisorWeightPercent"),
    logbookWeightPercent: formData.get("logbookWeightPercent"),
    passThreshold: formData.get("passThreshold"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the values entered." };
  }

  const { supervisorWeightPercent, logbookWeightPercent, passThreshold } = parsed.data;
  if (supervisorWeightPercent + logbookWeightPercent !== 100) {
    return { error: "Supervisor and logbook weights must add up to 100." };
  }

  await prisma.scoringConfig.upsert({
    where: { programId: coordinatorProfile.programId },
    create: {
      programId: coordinatorProfile.programId,
      supervisorWeight: supervisorWeightPercent / 100,
      logbookWeight: logbookWeightPercent / 100,
      passThreshold,
      updatedById: session.user.id,
    },
    update: {
      supervisorWeight: supervisorWeightPercent / 100,
      logbookWeight: logbookWeightPercent / 100,
      passThreshold,
      updatedById: session.user.id,
    },
  });

  revalidatePath("/coordinator/scoring-settings");
  return { success: true };
}
