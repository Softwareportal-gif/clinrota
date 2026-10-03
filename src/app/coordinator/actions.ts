"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";
import { getCoordinatorProfileByUserId } from "@/lib/coordinator";
import { computeRotationScore, DEFAULT_PASS_THRESHOLD } from "@/lib/scoring";

export type ScoreActionState = { error?: string; success?: string } | undefined;

async function loadOwnedRotation(rotationId: string, programId: string) {
  const rotation = await prisma.rotation.findUnique({
    where: { id: rotationId },
    include: { program: { include: { scoringConfig: true } } },
  });
  if (!rotation || rotation.programId !== programId) {
    throw new Error("Rotation not found.");
  }
  return rotation;
}

export async function recalculateScore(
  rotationId: string,
  _prevState: ScoreActionState,
  _formData: FormData
): Promise<ScoreActionState> {
  const session = await requireRole("COORDINATOR");
  const coordinatorProfile = await getCoordinatorProfileByUserId(session.user.id);
  const rotation = await loadOwnedRotation(rotationId, coordinatorProfile.programId);

  const result = await computeRotationScore(rotationId);
  if (!result.scoreable) {
    return { error: result.reason };
  }

  // Recalculating replaces the computed baseline, so any prior override
  // (based on now-stale data) is cleared. The coordinator can re-override
  // afterward if the reason still applies.
  await prisma.rotationScore.upsert({
    where: { rotationId },
    create: {
      rotationId,
      studentId: rotation.studentId,
      supervisorScore: result.supervisorScore,
      logbookScore: result.logbookScore,
      logbookCaseCoverageScore: result.breakdown.competencyCoverageScore,
      logbookApprovalRateScore: result.breakdown.approvalRateScore,
      logbookTimelinessScore: result.breakdown.timelinessScore,
      logbookCompletenessScore: result.breakdown.completenessScore,
      computedFinalScore: result.computedFinalScore,
      finalScore: result.computedFinalScore,
      passed: result.passed,
    },
    update: {
      supervisorScore: result.supervisorScore,
      logbookScore: result.logbookScore,
      logbookCaseCoverageScore: result.breakdown.competencyCoverageScore,
      logbookApprovalRateScore: result.breakdown.approvalRateScore,
      logbookTimelinessScore: result.breakdown.timelinessScore,
      logbookCompletenessScore: result.breakdown.completenessScore,
      computedFinalScore: result.computedFinalScore,
      finalScore: result.computedFinalScore,
      passed: result.passed,
      computedAt: new Date(),
      isOverridden: false,
      overrideReason: null,
      overriddenById: null,
      overriddenAt: null,
    },
  });

  revalidatePath("/coordinator");
  revalidatePath(`/coordinator/scores/${rotationId}`);
  return { success: "Score calculated." };
}

export async function overrideScore(
  rotationId: string,
  _prevState: ScoreActionState,
  formData: FormData
): Promise<ScoreActionState> {
  const session = await requireRole("COORDINATOR");
  const coordinatorProfile = await getCoordinatorProfileByUserId(session.user.id);
  const rotation = await loadOwnedRotation(rotationId, coordinatorProfile.programId);

  const existing = await prisma.rotationScore.findUnique({ where: { rotationId } });
  if (!existing) {
    return { error: "Calculate a score before overriding it." };
  }

  const overrideValue = Number(formData.get("overrideScore"));
  const reason = String(formData.get("reason") ?? "").trim();

  if (Number.isNaN(overrideValue) || overrideValue < 0 || overrideValue > 100) {
    return { error: "Enter an override score between 0 and 100." };
  }
  if (!reason) {
    return { error: "A reason is required to override a score." };
  }

  const passThreshold = rotation.program.scoringConfig?.passThreshold ?? DEFAULT_PASS_THRESHOLD;

  await prisma.rotationScore.update({
    where: { rotationId },
    data: {
      finalScore: overrideValue,
      passed: overrideValue >= passThreshold,
      isOverridden: true,
      overrideReason: reason,
      overriddenById: session.user.id,
      overriddenAt: new Date(),
    },
  });

  revalidatePath(`/coordinator/scores/${rotationId}`);
  revalidatePath("/coordinator");
  return { success: "Override saved." };
}
