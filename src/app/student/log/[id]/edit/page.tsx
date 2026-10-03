import { requireRole } from "@/lib/require-role";
import { getStudentProfileByUserId } from "@/lib/student";
import { prisma } from "@/lib/prisma";
import { EDITABLE_STATUSES } from "@/lib/log-entry-constants";
import { LogWizard, type FieldsState } from "./log-wizard";
import { parseExtraLogFields } from "@/lib/discipline-template";

export default async function EditLogEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireRole("STUDENT");
  const studentProfile = await getStudentProfileByUserId(session.user.id);

  const entry = await prisma.logEntry.findUnique({
    where: { id },
    include: { rotation: { include: { program: { include: { disciplineTemplate: true } } } } },
  });

  // Reconstructed-from-local-queue entries (never synced) have no server
  // row to derive a template from — both seeded templates define no extra
  // fields anyway, so falling back to none here only matters once a
  // discipline actually uses them, and only for this one reload-while-
  // offline edge case.
  const extraLogFields = entry
    ? parseExtraLogFields(entry.rotation.program.disciplineTemplate.extraLogFields)
    : [];

  let initialFields: FieldsState | null = null;
  if (entry && entry.studentId === studentProfile.id && EDITABLE_STATUSES.includes(entry.status)) {
    initialFields = {
      subjective: entry.subjective,
      vitalTempC: entry.vitalTempC?.toString() ?? "",
      vitalBpSystolic: entry.vitalBpSystolic?.toString() ?? "",
      vitalBpDiastolic: entry.vitalBpDiastolic?.toString() ?? "",
      vitalPulse: entry.vitalPulse?.toString() ?? "",
      vitalRespRate: entry.vitalRespRate?.toString() ?? "",
      vitalSpo2: entry.vitalSpo2?.toString() ?? "",
      objectiveFindings: entry.objectiveFindings,
      assessment: entry.assessment,
      plan: entry.plan,
    };
  }
  // If `entry` is null (or not editable), we don't 404 here — it may be an
  // entry created entirely offline that the server has never seen yet.
  // LogWizard falls back to reconstructing state from the local queue.

  return (
    <div className="mx-auto w-full max-w-2xl">
      <LogWizard
        logEntryId={id}
        userId={session.user.id}
        initialFields={initialFields}
        extraLogFields={extraLogFields}
      />
    </div>
  );
}
