import { prisma } from "@/lib/prisma";

// Cohorts are a program's class groups — usually its year levels
// ("Level 100", "Level 200", …) for one academic year and term. Shared by
// the coordinator's Cohorts page and the student import, which can create
// the levels a spreadsheet mentions.

export type CohortDetails = {
  academicYear: string; // e.g. "2026/2027"
  term: string; // e.g. "Semester 1"
  startDate: string; // yyyy-mm-dd, from a date input
  endDate: string;
};

const MAX_NAME_LENGTH = 60;
const MAX_NAMES_AT_ONCE = 20;

// "Level 100, Level 200" or one per line → ["Level 100", "Level 200"],
// trimmed and without repeats (ignoring case).
export function parseCohortNames(raw: string): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const part of raw.split(/[,\n]/)) {
    const name = part.trim().replace(/\s+/g, " ");
    if (name && !seen.has(name.toLowerCase())) {
      seen.add(name.toLowerCase());
      names.push(name);
    }
  }
  return names;
}

function parseDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function validateCohortInput(names: string[], details: CohortDetails): string | null {
  if (names.length === 0) return "Enter at least one cohort name.";
  if (names.length > MAX_NAMES_AT_ONCE) return `Add at most ${MAX_NAMES_AT_ONCE} cohorts at a time.`;
  const tooLong = names.find((n) => n.length > MAX_NAME_LENGTH);
  if (tooLong) return `"${tooLong.slice(0, 20)}…" is too long — keep names under ${MAX_NAME_LENGTH} characters.`;
  if (!details.academicYear.trim()) return "Enter the academic year, e.g. 2026/2027.";
  if (!details.term.trim()) return "Enter the term, e.g. Semester 1.";
  const start = parseDate(details.startDate);
  const end = parseDate(details.endDate);
  if (!start || !end) return "Enter a start and end date.";
  if (end < start) return "The end date must be on or after the start date.";
  return null;
}

// Creates each named cohort for the program, skipping any that already
// exist with the same name, academic year and term.
export async function createCohorts(
  programId: string,
  names: string[],
  details: CohortDetails
): Promise<{ ok: true; created: string[]; skipped: string[] } | { ok: false; error: string }> {
  const error = validateCohortInput(names, details);
  if (error) return { ok: false, error };

  const academicYear = details.academicYear.trim();
  const term = details.term.trim();
  const existing = await prisma.cohort.findMany({ where: { programId, academicYear, term } });
  const existingNames = new Set(existing.map((c) => c.name.toLowerCase()));

  const created = names.filter((n) => !existingNames.has(n.toLowerCase()));
  const skipped = names.filter((n) => existingNames.has(n.toLowerCase()));
  if (created.length > 0) {
    await prisma.cohort.createMany({
      data: created.map((name) => ({
        programId,
        name,
        academicYear,
        term,
        startDate: parseDate(details.startDate)!,
        endDate: parseDate(details.endDate)!,
      })),
    });
  }
  return { ok: true, created, skipped };
}

export function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

// The academic year a new cohort most likely belongs to, assuming years
// start around September: in October 2026 that's "2026/2027".
export function currentAcademicYear(now = new Date()) {
  const year = now.getUTCFullYear();
  return now.getUTCMonth() >= 7 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
}
