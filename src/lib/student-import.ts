import { prisma } from "@/lib/prisma";

// Raw values straight out of the CSV — everything is a string, possibly
// empty/malformed, until validated.
export type RawStudentRow = {
  firstName: string;
  lastName: string;
  email: string;
  cohort: string;
};

export type StudentRowResult = {
  row: number; // 1-based, matching what a coordinator sees when they open the file
  data: RawStudentRow;
  status: "valid" | "error";
  errorMessage?: string;
  cohortId?: string; // resolved once valid — avoids re-querying at commit time
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Validated against the DATABASE (email-in-use, cohort-exists), not just
// shape — every row gets a result, first pass never partially commits.
// Sequential DB lookups, not Promise.all, for the same connection-pool
// reason documented elsewhere in this codebase (see e.g.
// src/lib/student-record.ts) — a large CSV shouldn't fan out one query per
// row concurrently.
export async function validateStudentRows(
  rows: RawStudentRow[],
  programId: string
): Promise<StudentRowResult[]> {
  const cohorts = await prisma.cohort.findMany({ where: { programId } });
  const cohortByName = new Map(cohorts.map((c) => [c.name.trim().toLowerCase(), c]));

  const existingUsers = await prisma.user.findMany({ select: { email: true } });
  const existingEmails = new Set(existingUsers.map((u) => u.email.toLowerCase()));

  // Only the FIRST occurrence of a given email within the file is left
  // valid (assuming it's otherwise fine) — later occurrences are flagged
  // as in-file duplicates, so a file with one repeated email produces
  // exactly one error row, not two.
  const seenEmailsInFile = new Set<string>();

  const results: StudentRowResult[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 1;
    const firstName = row.firstName?.trim() ?? "";
    const lastName = row.lastName?.trim() ?? "";
    const email = row.email?.trim() ?? "";
    const emailLower = email.toLowerCase();
    const cohortName = row.cohort?.trim() ?? "";
    const data: RawStudentRow = { firstName, lastName, email, cohort: cohortName };

    const fail = (errorMessage: string): StudentRowResult => ({
      row: rowNumber,
      data,
      status: "error",
      errorMessage,
    });

    if (!firstName || !lastName || !email || !cohortName) {
      results.push(fail("Missing required field (firstName, lastName, email, or cohort)."));
      continue;
    }
    if (!EMAIL_RE.test(email)) {
      results.push(fail(`"${email}" is not a valid email address.`));
      continue;
    }
    if (seenEmailsInFile.has(emailLower)) {
      results.push(fail(`Duplicate email within this file: "${email}".`));
      continue;
    }
    if (existingEmails.has(emailLower)) {
      results.push(fail(`Email already registered: "${email}".`));
      continue;
    }
    const cohort = cohortByName.get(cohortName.toLowerCase());
    if (!cohort) {
      results.push(fail(`Cohort "${cohortName}" does not exist in this program.`));
      continue;
    }

    seenEmailsInFile.add(emailLower);
    results.push({ row: rowNumber, data, status: "valid", cohortId: cohort.id });
  }

  return results;
}
