"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";
import { getCoordinatorProfileByUserId } from "@/lib/coordinator";
import { ENTRUSTMENT_LEVEL_ORDER } from "@/lib/entrustment";
import type { EntrustmentLevel } from "@/generated/prisma/client";

export type CompetencyState = { error?: string } | undefined;

const addSchema = z.object({
  name: z.string().trim().min(2, "Enter a name.").max(150),
  description: z.string().trim().max(300).optional(),
});

export async function addCompetency(
  _prevState: CompetencyState,
  formData: FormData
): Promise<CompetencyState> {
  const session = await requireRole("COORDINATOR");
  const coordinatorProfile = await getCoordinatorProfileByUserId(session.user.id);

  const parsed = addSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const existing = await prisma.competency.findFirst({
    where: { programId: coordinatorProfile.programId, name: parsed.data.name },
  });
  if (existing) {
    if (existing.isActive) return { error: "That competency already exists." };
    await prisma.competency.update({ where: { id: existing.id }, data: { isActive: true } });
  } else {
    await prisma.competency.create({
      data: {
        programId: coordinatorProfile.programId,
        name: parsed.data.name,
        description: parsed.data.description || null,
      },
    });
  }

  revalidatePath("/coordinator/competencies");
}

export async function toggleCompetencyActive(
  competencyId: string,
  _prevState: CompetencyState,
  _formData: FormData
): Promise<CompetencyState> {
  const session = await requireRole("COORDINATOR");
  const coordinatorProfile = await getCoordinatorProfileByUserId(session.user.id);

  const competency = await prisma.competency.findUnique({ where: { id: competencyId } });
  if (!competency || competency.programId !== coordinatorProfile.programId) {
    return { error: "Competency not found." };
  }

  await prisma.competency.update({
    where: { id: competencyId },
    data: { isActive: !competency.isActive },
  });

  revalidatePath("/coordinator/competencies");
}

export async function updateRequirement(
  competencyId: string,
  _prevState: CompetencyState,
  formData: FormData
): Promise<CompetencyState> {
  const session = await requireRole("COORDINATOR");
  const coordinatorProfile = await getCoordinatorProfileByUserId(session.user.id);

  const competency = await prisma.competency.findUnique({ where: { id: competencyId } });
  if (!competency || competency.programId !== coordinatorProfile.programId) {
    return { error: "Competency not found." };
  }

  const required = formData.get("required") === "on";

  if (!required) {
    await prisma.programCompetencyRequirement.deleteMany({
      where: { programId: coordinatorProfile.programId, competencyId },
    });
    revalidatePath("/coordinator/competencies");
    return;
  }

  const minOccurrences = Math.max(1, Number(formData.get("minOccurrences")) || 1);
  const minEntrustmentLevelRaw = formData.get("minEntrustmentLevel");
  if (
    typeof minEntrustmentLevelRaw !== "string" ||
    !ENTRUSTMENT_LEVEL_ORDER.includes(minEntrustmentLevelRaw as EntrustmentLevel)
  ) {
    return { error: "Select a valid minimum entrustment level." };
  }

  await prisma.programCompetencyRequirement.upsert({
    where: {
      programId_competencyId: { programId: coordinatorProfile.programId, competencyId },
    },
    create: {
      programId: coordinatorProfile.programId,
      competencyId,
      minOccurrences,
      minEntrustmentLevel: minEntrustmentLevelRaw as EntrustmentLevel,
    },
    update: {
      minOccurrences,
      minEntrustmentLevel: minEntrustmentLevelRaw as EntrustmentLevel,
    },
  });

  revalidatePath("/coordinator/competencies");
}
