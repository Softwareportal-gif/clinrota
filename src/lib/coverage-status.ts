// Coverage report status for one student x competency cell — computed at
// read time from the student's approved LogEntries, same "no stored
// derived state" pattern as compliance-status.ts and site-status.ts.
export type CoverageStatus = "NOT_ATTEMPTED" | "BELOW_MINIMUM" | "MET";

export function getCoverageStatus(
  highestLevelValue: number | null,
  minLevelValue: number
): CoverageStatus {
  if (highestLevelValue === null) return "NOT_ATTEMPTED";
  return highestLevelValue >= minLevelValue ? "MET" : "BELOW_MINIMUM";
}

export const COVERAGE_STATUS_LABELS: Record<CoverageStatus, string> = {
  NOT_ATTEMPTED: "Not yet attempted",
  BELOW_MINIMUM: "Below minimum",
  MET: "Met",
};

export const COVERAGE_STATUS_BADGE_CLASSES: Record<CoverageStatus, string> = {
  NOT_ATTEMPTED: "bg-gray-100 text-gray-500",
  BELOW_MINIMUM: "bg-amber-100 text-amber-700",
  MET: "bg-green-100 text-green-700",
};
