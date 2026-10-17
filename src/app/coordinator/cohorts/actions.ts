"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";
import { getCoordinatorProfileByUserId } from "@/lib/coordinator";
import { createCohorts, parseCohortNames, validateCohortInput, type CohortDetails } from "@/lib/cohorts";

export type CohortFormState = { ok: true; message: string } | { ok: false; error: string } | undefined;

function detailsFrom(formData: FormData): CohortDetails {
  return {
    academicYear: String(formData.get("academicYear") ?? ""),
    term: String(formData.get("term") ?? ""),
    startDate: String(formData.get("startDate") ?? ""),
    endDate: String(formData.get("endDate") ?? ""),
  };
}

async function coordinatorProgramId() {
  const session = await requireRole("COORDINATOR");
  return (await getCoordinatorProfileByUserId(session.user.id)).programId;
}

export async function addCohorts(_prev: CohortFormState, formData: FormData): Promise<CohortFormState> {
  const programId = await coordinatorProgramId();
  const result = await createCohorts(programId, parseCohortNames(String(formData.get("names") ?? "")), detailsFrom(formData));
  if (!result.ok) return result;

  revalidatePath("/coordinator/cohorts");
  const parts = [];
  if (result.created.length) parts.push(`Added ${result.created.join(", ")}.`);
  if (result.skipped.length) parts.push(`${result.skipped.join(", ")} already existed for that term.`);
  return { ok: true, message: parts.join(" ") };
}

export async function updateCohort(cohortId: string, _prev: CohortFormState, formData: FormData): Promise<CohortFormState> {
  const programId = await coordinatorProgramId();
  const cohort = await prisma.cohort.findFirst({ where: { id: cohortId, programId } });
  if (!cohort) return { ok: false, error: "That cohort no longer exists." };

  const name = String(formData.get("name") ?? "").trim().replace(/\s+/g, " ");
  const details = detailsFrom(formData);
  const error = validateCohortInput(name ? [name] : [], details);
  if (error) return { ok: false, error };

  const clash = await prisma.cohort.findFirst({
    where: {
      programId,
      id: { not: cohortId },
      name: { equals: name, mode: "insensitive" },
      academicYear: details.academicYear.trim(),
      term: details.term.trim(),
    },
  });
  if (clash) return { ok: false, error: `There's already a "${name}" for that academic year and term.` };

  await prisma.cohort.update({
    where: { id: cohortId },
    data: {
      name,
      academicYear: details.academicYear.trim(),
      term: details.term.trim(),
      startDate: new Date(`${details.startDate}T00:00:00Z`),
      endDate: new Date(`${details.endDate}T00:00:00Z`),
    },
  });
  revalidatePath("/coordinator/cohorts");
  return { ok: true, message: "Saved." };
}

// Only an unused cohort can be deleted — one with students, rotations,
// imports or preference cycles keeps that history.
export async function deleteCohort(cohortId: string): Promise<CohortFormState> {
  const programId = await coordinatorProgramId();
  const cohort = await prisma.cohort.findFirst({
    where: { id: cohortId, programId },
    include: {
      _count: { select: { studentProfiles: true, rotations: true, studentImportBatches: true, preferenceCycles: true } },
    },
  });
  if (!cohort) return { ok: false, error: "That cohort no longer exists." };
  const used = Object.values(cohort._count).some((n) => n > 0);
  if (used) return { ok: false, error: "This cohort has students or history, so it can't be deleted." };

  await prisma.cohort.delete({ where: { id: cohortId } });
  revalidatePath("/coordinator/cohorts");
  return { ok: true, message: "Deleted." };
}
