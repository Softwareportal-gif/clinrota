import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole } from "@/lib/require-role";
import { getStudentProfileByUserId } from "@/lib/student";
import { prisma } from "@/lib/prisma";
import { answeredExtraFields } from "@/lib/discipline-template";
import { StatusBadge } from "@/components/status-badge";
import { EDITABLE_STATUSES } from "@/lib/log-entry-constants";
import { ENTRUSTMENT_LEVEL_LABELS } from "@/lib/entrustment";

export default async function LogEntryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireRole("STUDENT");
  const studentProfile = await getStudentProfileByUserId(session.user.id);

  const entry = await prisma.logEntry.findUnique({
    where: { id },
    include: {
      competencies: { include: { competency: true } },
      review: true,
      rotation: { include: { clinicalSite: true, program: { include: { disciplineTemplate: true } } } },
    },
  });
  if (!entry || entry.studentId !== studentProfile.id) notFound();

  const canEdit = EDITABLE_STATUSES.includes(entry.status);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{entry.caseTitle}</h2>
            <p className="text-sm text-gray-500">
              {entry.rotation.clinicalSite.name} ·{" "}
              {new Date(entry.occurredAt).toLocaleDateString()}
            </p>
          </div>
          <StatusBadge status={entry.status} />
        </div>

        {entry.review && (
          <div className="rounded-md border border-gray-200 bg-white p-4">
            <p className="text-sm font-medium text-gray-700">Supervisor feedback</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">
              {entry.review.comments || "No comments left."}
            </p>
            <p className="mt-2 text-xs text-gray-400">
              {new Date(entry.review.reviewedAt).toLocaleString()}
            </p>
          </div>
        )}

        <dl className="space-y-4 rounded-md border border-gray-200 bg-white p-4 text-sm">
          <div>
            <dt className="font-medium text-gray-700">Case category</dt>
            <dd className="text-gray-600">
              {entry.competencies.map((c) => c.competency.name).join(", ") || "—"}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-gray-700">Your self-reported supervision level</dt>
            <dd className="text-gray-600">{ENTRUSTMENT_LEVEL_LABELS[entry.studentRole]}</dd>
          </div>
          {entry.supervisorAssessedRole && (
            <div>
              <dt className="font-medium text-gray-700">Supervisor&apos;s assessed level</dt>
              <dd className="text-gray-600">
                {ENTRUSTMENT_LEVEL_LABELS[entry.supervisorAssessedRole]}
              </dd>
            </div>
          )}
          <div>
            <dt className="font-medium text-gray-700">Subjective</dt>
            <dd className="whitespace-pre-wrap text-gray-600">{entry.subjective || "—"}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-700">Objective</dt>
            <dd className="text-gray-600">
              <ul className="mb-1 grid grid-cols-2 gap-1 text-xs text-gray-500">
                {entry.vitalTempC != null && <li>Temp: {entry.vitalTempC} °C</li>}
                {entry.vitalBpSystolic != null && entry.vitalBpDiastolic != null && (
                  <li>
                    BP: {entry.vitalBpSystolic}/{entry.vitalBpDiastolic} mmHg
                  </li>
                )}
                {entry.vitalPulse != null && <li>Pulse: {entry.vitalPulse} bpm</li>}
                {entry.vitalRespRate != null && <li>RR: {entry.vitalRespRate} /min</li>}
                {entry.vitalSpo2 != null && <li>SpO2: {entry.vitalSpo2}%</li>}
              </ul>
              <p className="whitespace-pre-wrap">{entry.objectiveFindings || "—"}</p>
            </dd>
          </div>
          <div>
            <dt className="font-medium text-gray-700">Assessment</dt>
            <dd className="whitespace-pre-wrap text-gray-600">{entry.assessment || "—"}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-700">Plan</dt>
            <dd className="whitespace-pre-wrap text-gray-600">{entry.plan || "—"}</dd>
          </div>
          {answeredExtraFields(entry.rotation.program.disciplineTemplate.extraLogFields, entry.extraFields).map((f) => (
            <div key={f.key}>
              <dt className="font-medium text-gray-700">{f.label}</dt>
              <dd className="whitespace-pre-wrap text-gray-600">{f.value}</dd>
            </div>
          ))}
        </dl>

        <div className="flex items-center gap-4">
          <Link href="/student/logbook" className="text-sm text-gray-500 hover:underline">
            ← Back to logbook
          </Link>
          {canEdit && (
            <Link
              href={`/student/log/${entry.id}/edit`}
              className="ml-auto rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white"
            >
              {entry.status === "DRAFT" ? "Continue editing" : "Edit & resubmit"}
            </Link>
          )}
        </div>
    </div>
  );
}
