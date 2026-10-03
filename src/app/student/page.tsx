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

function fmtDeadline(d: Date) {
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
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
  if (urgentDocCount > 0) {
    return `${urgentDocCount} document${urgentDocCount === 1 ? "" : "s"} need${urgentDocCount === 1 ? "s" : ""} your attention before your next rotation.`;
  }
  if (preferenceStatus === "DRAFT" && preferenceDeadline) {
    return `Rank your rotation preferences by ${fmtDeadline(preferenceDeadline)}.`;
  }
  if (overdueChecklistCount > 0) {
    return `${overdueChecklistCount} placement to-do${overdueChecklistCount === 1 ? "" : "s"} still open.`;
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
  const overdueChecklistCount = placements
    .filter((p) => p.status === "ACTIVE")
    .reduce((sum, p) => sum + p.checklist.filter((c) => !c.done).length, 0);

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
  const hasActiveRotation = rotations.some((r) => r.status === "ACTIVE");

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
            submittedAtLabel={submission ? new Date(submission.submittedAt).toLocaleDateString() : null}
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
