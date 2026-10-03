// A LogEntry with a wardAssignmentId is reviewed by that WardAssignment's
// wardSupervisor instead of the rotation's main supervisor — the only case
// where "who can review this entry" differs from "who is the rotation's
// supervisor". Null wardAssignmentId (ward supervision off for this site,
// or data from before this feature existed) keeps today's behavior exactly.
export function canReviewLogEntry(
  entry: {
    rotation: { supervisorId: string };
    wardAssignment: { wardSupervisorId: string } | null;
  },
  supervisorProfileId: string
): boolean {
  if (entry.wardAssignment) {
    return entry.wardAssignment.wardSupervisorId === supervisorProfileId;
  }
  return entry.rotation.supervisorId === supervisorProfileId;
}
