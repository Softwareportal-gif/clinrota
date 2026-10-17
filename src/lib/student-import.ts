import { prisma } from "@/lib/prisma";

// Raw values straight out of the CSV — everything is a string, possibly
// empty/malformed, until validated.
export type RawStudentRow = {
  firstName: string;
  lastName: string;
  email: string;
  cohort: string; // the "level" or "cohort" column
  studentId: string; // the school's own ID number; optional
};

export type StudentRowResult = {
  row: number; // 1-based, matching what a coordinator sees when they open the file
  data: RawStudentRow;
  // "missing_cohort": the row is fine except that its level doesn't exist
  // in the program yet — the import screen offers to create it.
  status: "valid" | "error" | "missing_cohort";
  errorMessage?: string;
  cohortId?: string; // resolved once valid — avoids re-querying at commit time
};

const MAX_STUDENT_ID_LENGTH = 40;

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
  // Levels match by name, ignoring case. A name reused across academic
  // years ("Level 100" in 2026/2027 and 2027/2028) resolves to the cohort
  // that starts latest — ordering by startDate means it's set last.
  const cohorts = await prisma.cohort.findMany({ where: { programId }, orderBy: { startDate: "asc" } });
  const cohortByName = new Map(cohorts.map((c) => [c.name.trim().toLowerCase(), c]));

  const existingUsers = await prisma.user.findMany({ select: { email: true } });
  const existingEmails = new Set(existingUsers.map((u) => u.email.toLowerCase()));
  const existingIds = new Set(
    (await prisma.studentProfile.findMany({ select: { studentIdNumber: true } })).map((p) =>
      p.studentIdNumber.toLowerCase()
    )
  );
  const seenIdsInFile = new Set<string>();

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
    const cohortName = row.cohort?.trim().replace(/s+/g, " ") ?? "";
    const studentId = row.studentId?.trim() ?? "";
    const studentIdLower = studentId.toLowerCase();
    const data: RawStudentRow = { firstName, lastName, email, cohort: cohortName, studentId };

    const fail = (errorMessage: string): StudentRowResult => ({
      row: rowNumber,
      data,
      status: "error",
      errorMessage,
    });

    if (!firstName || !lastName || !email || !cohortName) {
      results.push(fail("Missing required field (first name, last name, email, or level)."));
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
    if (studentId) {
      if (studentId.length > MAX_STUDENT_ID_LENGTH) {
        results.push(fail(`Student ID "${studentId.slice(0, 20)}…" is too long.`));
        continue;
      }
      if (seenIdsInFile.has(studentIdLower)) {
        results.push(fail(`Duplicate student ID within this file: "${studentId}".`));
        continue;
      }
      if (existingIds.has(studentIdLower)) {
        results.push(fail(`Student ID already in use: "${studentId}".`));
        continue;
      }
    }

    // Claimed even when the level is missing, so a duplicate later in the
    // file is still caught once the level is created.
    seenEmailsInFile.add(emailLower);
    if (studentId) seenIdsInFile.add(studentIdLower);

    const cohort = cohortByName.get(cohortName.toLowerCase());
    if (!cohort) {
      results.push({
        row: rowNumber,
        data,
        status: "missing_cohort",
        errorMessage: `"${cohortName}" doesn't exist yet.`,
      });
      continue;
    }
    results.push({ row: rowNumber, data, status: "valid", cohortId: cohort.id });
  }

  return results;
}
