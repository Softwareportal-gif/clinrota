"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";
import { getSupervisorProfileByUserId } from "@/lib/supervisor";
import { flattenRubric, NOT_ASSESSED, parseRubric } from "@/lib/discipline-template";

export type EvalState = { error?: string } | undefined;

export async function saveEvaluation(
  rotationId: string,
  _prevState: EvalState,
  formData: FormData
): Promise<EvalState> {
  const session = await requireRole("SUPERVISOR");
  const supervisorProfile = await getSupervisorProfileByUserId(session.user.id);

  const rotation = await prisma.rotation.findUnique({
    where: { id: rotationId },
    include: { program: { include: { disciplineTemplate: true } } },
  });
  if (!rotation || rotation.supervisorId !== supervisorProfile.id) {
    return { error: "Rotation not found." };
  }

  const existing = await prisma.competencyEvaluation.findFirst({
    where: { rotationId, studentId: rotation.studentId },
  });
  if (existing?.status === "SUBMITTED") {
    return { error: "This evaluation has already been finalized." };
  }

  // Validated against THIS rotation's Program's DisciplineTemplate, not a
  // fixed LCJR list — a different template defines a different set of
  // required sub-dimensions and a different valid level range.
  const rubric = parseRubric(rotation.program.disciplineTemplate.rubric);
  const validLevels = rubric.scaleLevels.map((s) => s.value);
  const minLevel = Math.min(...validLevels);
  const maxLevel = Math.max(...validLevels);

  const ratings: { dimension: string; subDimension: string; level: number }[] = [];
  // Items marked "not assessed" (only offered when the rubric allows it)
  // store no rating, so they stay out of every average.
  const notAssessed: string[] = [];
  for (const { dimension, subDimension, label } of flattenRubric(rubric)) {
    const raw = formData.get(`level_${subDimension}`);
    if (raw === NOT_ASSESSED && rubric.notAssessedLabel) {
      notAssessed.push(subDimension);
      continue;
    }
    const level = Number(raw);
    if (!raw || Number.isNaN(level) || level < minLevel || level > maxLevel) {
      return { error: `Select a level for "${label}".` };
    }
    ratings.push({ dimension, subDimension, level });
  }

  const overallComments = String(formData.get("overallComments") ?? "").trim();
  const intent = formData.get("intent");
  const status = intent === "final" ? "SUBMITTED" : "DRAFT";
  if (status === "SUBMITTED" && ratings.length === 0) {
    return { error: "Rate at least one item before marking the evaluation as final." };
  }

  // One transaction so a mid-write failure (e.g. a dropped connection)
  // can't leave the evaluation marked final with incomplete ratings.
  await prisma.$transaction(async (tx) => {
    const evaluation = existing
      ? await tx.competencyEvaluation.update({
          where: { id: existing.id },
          data: { overallComments: overallComments || null, status, evaluationDate: new Date() },
        })
      : await tx.competencyEvaluation.create({
          data: {
            rotationId,
            studentId: rotation.studentId,
            supervisorId: session.user.id,
            overallComments: overallComments || null,
            status,
          },
        });

    // Sequential, not Promise.all — many concurrent queries can exhaust
    // the local dev database's connection pool.
    for (const r of ratings) {
      await tx.lcjrRating.upsert({
        where: {
          evaluationId_subDimension: { evaluationId: evaluation.id, subDimension: r.subDimension },
        },
        create: {
          evaluationId: evaluation.id,
          dimension: r.dimension,
          subDimension: r.subDimension,
          level: r.level,
        },
        update: { level: r.level },
      });
    }
    if (notAssessed.length > 0) {
      await tx.lcjrRating.deleteMany({
        where: { evaluationId: evaluation.id, subDimension: { in: notAssessed } },
      });
    }
  });

  redirect(`/supervisor/evaluate/${rotationId}`);
}
