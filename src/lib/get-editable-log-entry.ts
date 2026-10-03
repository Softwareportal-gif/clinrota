import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { EDITABLE_STATUSES } from "@/lib/log-entry-constants";

// Used by the step-wizard *pages* (Server Components) to load and guard a
// draft/rejected/needs-revision entry. Submitted/approved entries redirect to
// the read-only view instead of rendering an editable step.
export async function getEditableLogEntry(id: string, studentProfileId: string) {
  const entry = await prisma.logEntry.findUnique({ where: { id } });
  if (!entry || entry.studentId !== studentProfileId) notFound();
  if (!EDITABLE_STATUSES.includes(entry.status)) {
    redirect(`/student/log/${id}`);
  }
  return entry;
}
