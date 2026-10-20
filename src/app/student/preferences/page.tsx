import { requireRole } from "@/lib/require-role";
import { getStudentProfileByUserId } from "@/lib/student";
import { getActiveCycleForStudent, getPreferenceStatus } from "@/lib/preference-cycle";
import { prisma } from "@/lib/prisma";
import { INK, TEXT_SECONDARY } from "../dashboard-sections/colors";
import { RotationPreferencesSection } from "../dashboard-sections/rotation-preferences-section";
import { formatDate } from "@/lib/format-date";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Rotation preferences" };

function fmtDeadline(d: Date) {
  return formatDate(d);
}

export default async function StudentPreferencesPage() {
  const session = await requireRole("STUDENT");
  const studentProfile = await getStudentProfileByUserId(session.user.id);

  const cycle = await getActiveCycleForStudent(studentProfile.cohortId);
  let shortlist: { id: string; clinicalSiteId: string; siteName: string; location: string | null; rank: number }[] = [];
  let availableSites: { id: string; name: string; location: string | null }[] = [];
  let submission: { submittedAt: Date } | null = null;

  if (cycle) {
    const [prefs, sub, allSites] = await Promise.all([
      prisma.rotationPreference.findMany({
        where: { cycleId: cycle.id, studentId: studentProfile.id },
        include: { clinicalSite: true },
        orderBy: { rank: "asc" },
      }),
      prisma.preferenceSubmission.findUnique({
        where: { cycleId_studentId: { cycleId: cycle.id, studentId: studentProfile.id } },
      }),
      prisma.clinicalSite.findMany({
        where: { institutionId: studentProfile.user.institutionId },
        orderBy: { name: "asc" },
      }),
    ]);
    shortlist = prefs.map((p) => ({
      id: p.id,
      clinicalSiteId: p.clinicalSiteId,
      siteName: p.clinicalSite.name,
      location: p.clinicalSite.location,
      rank: p.rank,
    }));
    submission = sub;
    const shortlistedIds = new Set(shortlist.map((s) => s.clinicalSiteId));
    availableSites = allSites
      .filter((s) => !shortlistedIds.has(s.id))
      .map((s) => ({ id: s.id, name: s.name, location: s.location }));
  }

  const preferenceStatus = getPreferenceStatus(cycle, !!submission);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold" style={{ color: INK }}>Rotation Preferences</h1>
        <p className="mt-1 text-sm" style={{ color: TEXT_SECONDARY }}>
          Rank your preferred clinical sites before the submission deadline.
        </p>
      </div>

      <RotationPreferencesSection
        cycleId={cycle?.id ?? null}
        status={preferenceStatus}
        minSelections={cycle?.minSelections ?? 0}
        maxSelections={cycle?.maxSelections ?? 0}
        deadlineLabel={cycle ? fmtDeadline(cycle.submissionDeadline) : null}
        submittedAtLabel={submission ? formatDate(submission.submittedAt) : null}
        shortlist={shortlist}
        availableSites={availableSites}
        showHeading={false}
      />
    </div>
  );
}
