import { prisma } from "@/lib/prisma";

// A cycle is locked once a coordinator explicitly closes it early, or once
// its deadline passes — whichever comes first. Computed at read time, same
// pattern as compliance-status.ts's EXPIRED/EXPIRING_SOON overlay, so it
// can never go stale without a background job.
export function isCycleLocked(cycle: { lockedAt: Date | null; submissionDeadline: Date }): boolean {
  return cycle.lockedAt !== null || Date.now() > cycle.submissionDeadline.getTime();
}

export type PreferenceStudentStatus = "NO_CYCLE" | "DRAFT" | "SUBMITTED" | "LOCKED";

// The cycle a student should see on their dashboard: the most recent one
// for their own cohort. A cohort could in principle have more than one
// cycle over time (unlikely at pilot scale, but not prevented), so "most
// recently created" is the reasonable single answer rather than showing a
// list — students only ever act on one wishlist at a time.
export async function getActiveCycleForStudent(cohortId: string | null) {
  if (!cohortId) return null;
  return prisma.preferenceCycle.findFirst({
    where: { cohortId },
    orderBy: { createdAt: "desc" },
  });
}

export function getPreferenceStatus(
  cycle: { lockedAt: Date | null; submissionDeadline: Date } | null,
  hasSubmission: boolean
): PreferenceStudentStatus {
  if (!cycle) return "NO_CYCLE";
  if (isCycleLocked(cycle) && !hasSubmission) return "LOCKED";
  if (hasSubmission) return isCycleLocked(cycle) ? "LOCKED" : "SUBMITTED";
  return "DRAFT";
}
