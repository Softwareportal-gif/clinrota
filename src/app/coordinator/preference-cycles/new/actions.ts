"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/require-role";
import { getCoordinatorProfileByUserId } from "@/lib/coordinator";
import { prisma } from "@/lib/prisma";

export type FormState = { error?: string } | undefined;

const schema = z.object({
  cohortId: z.string().min(1, "Select a cohort."),
  minSelections: z.coerce.number().int().min(1, "Minimum must be at least 1."),
  maxSelections: z.coerce.number().int().min(1),
  submissionDeadline: z.string().min(1, "Set a submission deadline."),
});

export async function createPreferenceCycle(_prevState: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole("COORDINATOR");
  const coordinatorProfile = await getCoordinatorProfileByUserId(session.user.id);

  const parsed = schema.safeParse({
    cohortId: formData.get("cohortId"),
    minSelections: formData.get("minSelections"),
    maxSelections: formData.get("maxSelections"),
    submissionDeadline: formData.get("submissionDeadline"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }
  if (parsed.data.maxSelections < parsed.data.minSelections) {
    return { error: "Maximum must be at least the minimum." };
  }

  const deadline = new Date(parsed.data.submissionDeadline);
  if (Number.isNaN(deadline.getTime())) {
    return { error: "Invalid deadline." };
  }

  const cohort = await prisma.cohort.findUnique({ where: { id: parsed.data.cohortId } });
  if (!cohort || cohort.programId !== coordinatorProfile.programId) {
    return { error: "Cohort not found." };
  }

  await prisma.preferenceCycle.create({
    data: {
      cohortId: cohort.id,
      minSelections: parsed.data.minSelections,
      maxSelections: parsed.data.maxSelections,
      submissionDeadline: deadline,
    },
  });

  redirect("/coordinator");
}
