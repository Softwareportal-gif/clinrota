"use server";

import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";
import { getCoordinatorProfileByUserId } from "@/lib/coordinator";
import { revalidatePath } from "next/cache";
import { validateStudentRows, type RawStudentRow, type StudentRowResult } from "@/lib/student-import";
import { createCohorts, type CohortDetails } from "@/lib/cohorts";

export async function validateImportRows(rows: RawStudentRow[]): Promise<StudentRowResult[]> {
  const session = await requireRole("COORDINATOR");
  const coordinatorProfile = await getCoordinatorProfileByUserId(session.user.id);
  return validateStudentRows(rows, coordinatorProfile.programId);
}

// Creates the levels an uploaded file mentions that the program doesn't
// have yet, so their rows can then be imported.
export async function createImportCohorts(
  names: string[],
  details: CohortDetails
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireRole("COORDINATOR");
  const coordinatorProfile = await getCoordinatorProfileByUserId(session.user.id);
  const result = await createCohorts(coordinatorProfile.programId, names, details);
  if (!result.ok) return result;
  revalidatePath("/coordinator/cohorts");
  return { ok: true };
}

export type ConfirmImportResult =
  | { ok: true; batchId: string; successCount: number; errorCount: number; totalRows: number }
  | { ok: false; error: string };

// Deliberately re-validates from the raw row data rather than trusting the
// client-submitted "valid" status — a TOCTOU race is possible (e.g.
// someone else's import claims the same email between the earlier
// validate call and this one), and the whole point of a server-side
// validation step is that the server, not the client, is authoritative.
export async function confirmImport(
  rawRows: RawStudentRow[],
  fileName: string,
  totalRowsInFile: number
): Promise<ConfirmImportResult> {
  const session = await requireRole("COORDINATOR");
  const coordinatorProfile = await getCoordinatorProfileByUserId(session.user.id);

  const revalidated = await validateStudentRows(rawRows, coordinatorProfile.programId);
  const stillValid = revalidated.filter(
    (r): r is StudentRowResult & { status: "valid"; cohortId: string } => r.status === "valid"
  );

  if (stillValid.length === 0) {
    return { ok: false, error: "None of the submitted rows are still valid — nothing to import." };
  }

  const passwordHash = await bcrypt.hash(randomUUID(), 10); // unusable placeholder — see User.passwordHash's schema comment

  // Sequential inside one transaction — the same pattern used for the
  // evaluation-ratings write in src/app/supervisor/evaluate/[rotationId]/
  // actions.ts (Promise.all across many rows has exhausted the local dev
  // database's connection pool before). All-or-nothing: if any row fails
  // unexpectedly partway through, the whole batch rolls back rather than
  // leaving a partial import.
  const batch = await prisma.$transaction(async (tx) => {
    for (const row of stillValid) {
      await tx.user.create({
        data: {
          institutionId: coordinatorProfile.program.institutionId,
          role: "STUDENT",
          name: `${row.data.firstName} ${row.data.lastName}`.trim(),
          email: row.data.email,
          passwordHash,
          status: "IMPORTED",
          studentProfile: {
            create: {
              // The school's own ID when the file has one; otherwise a
              // clearly-marked placeholder the coordinator can replace
              // with the real institutional ID later.
              studentIdNumber: row.data.studentId || `IMPORT-${randomUUID().slice(0, 8).toUpperCase()}`,
              programId: coordinatorProfile.programId,
              cohortId: row.cohortId,
            },
          },
        },
      });
    }

    const cohortIds = new Set(stillValid.map((r) => r.cohortId));
    const uniformCohortId = cohortIds.size === 1 ? [...cohortIds][0] : null;

    return tx.studentImportBatch.create({
      data: {
        coordinatorId: session.user.id,
        programId: coordinatorProfile.programId,
        cohortId: uniformCohortId,
        fileName,
        totalRows: totalRowsInFile,
        successCount: stillValid.length,
        errorCount: totalRowsInFile - stillValid.length,
      },
    });
  });

  return {
    ok: true,
    batchId: batch.id,
    successCount: batch.successCount,
    errorCount: batch.errorCount,
    totalRows: batch.totalRows,
  };
}
