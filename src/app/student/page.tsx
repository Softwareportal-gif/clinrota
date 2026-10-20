import { requireRole } from "@/lib/require-role";
import { getStudentProfileByUserId } from "@/lib/student";
import { getStudentRecordData } from "@/lib/student-record";
import { getPlacementSummaries } from "@/lib/placement-summary";
import { getActiveCycleForStudent, getPreferenceStatus, isCycleLocked } from "@/lib/preference-cycle";
import { getEffectiveDocStatus } from "@/lib/compliance-status";
import { prisma } from "@/lib/prisma";
import { WelcomeBanner } from "./dashboard-sections/welcome-banner";
import { RotationPreferencesSection } from "./dashboard-sections/rotation-preferences-section";
import { MyPlacementsSection } from "./dashboard-sections/my-placements-section";
import { RequiredDocumentsSection, type DocumentRow } from "./dashboard-sections/required-documents-section";
import { ClinicalLogQuickAdd } from "./dashboard-sections/clinical-log-quick-add";
import { ProfileSection } from "./dashboard-sections/profile-section";
import { canLogAgainst } from "@/lib/rotation-status";
import { formatDate } from "@/lib/format-date";
import type { Metadata } from "next";

// The layout's "%s · Praxxt" template only reaches child pages, not this one.
export const metadata: Metadata = { title: "Dashboard · Praxxt" };

function fmtDeadline(d: Date) {
  return formatDate(d);
}

// Priority-ordered — only the single most urgent thing surfaces in the
// welcome banner nudge, not a stacked list; a student with several things
// pending still gets one clear next step, not a wall of alerts.
function computeNudge(params: {
  urgentDocCount: number;
  overdueChecklistCount: number;
  preferenceStatus: string;
  preferenceDeadline: Date | null;
}): string | null {
  const { urgentDocCount, overdueChecklistCount, preferenceStatus, preferenceDeadline } = params;
  // The same things the "items need your attention" badge counts, in words.
  const parts = [
    urgentDocCount > 0 ? `${urgentDocCount} document${urgentDocCount === 1 ? "" : "s"}` : null,
    overdueChecklistCount > 0 ? `${overdueChecklistCount} placement to-do${overdueChecklistCount === 1 ? "" : "s"}` : null,
  ].filter((p): p is string => p !== null);
  if (parts.length > 0) {
    const total = urgentDocCount + overdueChecklistCount;
    return `${parts.join(" and ")} need${total === 1 ? "s" : ""} your attention.`;
  }
  if (preferenceStatus === "DRAFT" && preferenceDeadline) {
    return `Rank your rotation preferences by ${fmtDeadline(preferenceDeadline)}.`;
  }
  return null;
}

export default async function StudentDashboard() {
  const session = await requireRole("STUDENT");
  const studentProfile = await getStudentProfileByUserId(session.user.id);

  const data = await getStudentRecordData(studentProfile.id);
  if (!data) throw new Error("Student record not found.");
  const { student, rotations, compliance } = data;

  const placements = await getPlacementSummaries(studentProfile.id);
  // Open to-dos on running placements the student can act on. Documents are
  // counted once, below, not again as each placement's documents to-do; the
  // supervisor's evaluation isn't the student's to do.
  const overdueChecklistCount = placements
    .filter((p) => p.status === "ACTIVE")
    .reduce((sum, p) => sum + p.checklist.filter((c) => !c.done && c.actionHref && c.label !== "Required documents").length, 0);

  const documentRows: DocumentRow[] = await (async () => {
    const docs = await prisma.complianceDocument.findMany({ where: { studentId: studentProfile.id } });
    const docByType = new Map(docs.map((d) => [d.requiredDocumentTypeId, d]));
    return compliance.map((c) => {
      const doc = docByType.get(c.requiredDocumentTypeId);
      return {
        requiredDocumentTypeId: c.requiredDocumentTypeId,
        name: c.name,
        status: getEffectiveDocStatus(doc),
        expiryDate: c.expiryDate,
        fileUrl: doc?.fileUrl ?? null,
        rejectionReason: doc?.rejectionReason ?? null,
      };
    });
  })();
  const urgentDocCount = documentRows.filter((d) =>
    ["MISSING", "EXPIRING_SOON", "EXPIRED", "REJECTED"].includes(d.status)
  ).length;

  // Preferences
  const cycle = await getActiveCycleForStudent(student.cohortId);
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
        where: { institutionId: student.user.institutionId },
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
  const hasActiveRotation = rotations.some((r) => canLogAgainst(r));

  const cohortLabel = student.cohort
    ? `${student.cohort.name} · ${student.cohort.academicYear} ${student.cohort.term}`
    : null;

  const nudge = computeNudge({
    urgentDocCount,
    overdueChecklistCount,
    preferenceStatus,
    preferenceDeadline: cycle && !isCycleLocked(cycle) ? cycle.submissionDeadline : null,
  });
  const attentionCount = urgentDocCount + overdueChecklistCount + (preferenceStatus === "DRAFT" ? 1 : 0);

  return (
    <>
      <WelcomeBanner
        name={student.user.name}
        cohortLabel={cohortLabel}
        nudge={nudge}
        attentionCount={attentionCount}
      />

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <RotationPreferencesSection
            cycleId={cycle?.id ?? null}
            status={preferenceStatus}
            minSelections={cycle?.minSelections ?? 0}
            maxSelections={cycle?.maxSelections ?? 0}
            deadlineLabel={cycle ? fmtDeadline(cycle.submissionDeadline) : null}
            submittedAtLabel={submission ? formatDate(submission.submittedAt) : null}
            shortlist={shortlist}
            availableSites={availableSites}
          />

          <MyPlacementsSection placements={placements} limit={3} />
        </div>

        <div className="flex flex-col gap-6">
          <RequiredDocumentsSection documents={documentRows} />

          <ClinicalLogQuickAdd hasActiveRotation={hasActiveRotation} activeRotation={placements.find((p) => p.status === "ACTIVE") ?? null} />
        </div>
      </div>

      <ProfileSection
        name={student.user.name}
        programName={student.program.name}
        cohortLabel={cohortLabel}
        phone={student.phone}
        areasOfInterest={student.areasOfInterest}
        personalStatement={student.personalStatement}
      />
    </>
  );
}
