// What a rotation asks of a student beyond its score: a number of approved
// hours and approved cases (the rotation's own override, else the program
// default). A rotation can't be passed until both are met, and the student's
// to-do list counts toward them rather than ticking off after one entry.

export type RequirementInput = {
  approvedHours: number;
  requiredHours: number | null;
  approvedCases: number;
  requiredCases: number | null;
};

export type RequirementCheck = { met: boolean; missing: string[] };

const plural = (n: number, word: string) => `${n} more approved ${word}${n === 1 ? "" : "s"}`;

export function checkRequirements({ approvedHours, requiredHours, approvedCases, requiredCases }: RequirementInput): RequirementCheck {
  const missing: string[] = [];
  if (requiredHours !== null && approvedHours < requiredHours) {
    const short = Math.round((requiredHours - approvedHours) * 10) / 10;
    missing.push(plural(short, "hour"));
  }
  if (requiredCases !== null && approvedCases < requiredCases) {
    missing.push(plural(requiredCases - approvedCases, "case"));
  }
  return { met: missing.length === 0, missing };
}

// A SOAP note counts as complete when every section has real content: at
// least a few words each. Short, accurate clinical writing ("Healing well,
// no infection.") counts; an empty or one-word section doesn't.
export const SOAP_MIN_WORDS = 3;

const words = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

export function isSoapComplete(e: { subjective: string; objectiveFindings: string; assessment: string; plan: string }): boolean {
  return [e.subjective, e.objectiveFindings, e.assessment, e.plan].every((section) => words(section) >= SOAP_MIN_WORDS);
}
