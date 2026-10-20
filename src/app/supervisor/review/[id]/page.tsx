import { notFound } from "next/navigation";
import { requireRole } from "@/lib/require-role";
import { getSupervisorProfileByUserId } from "@/lib/supervisor";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "@/components/dashboard-header";
import { ENTRUSTMENT_LEVEL_LABELS } from "@/lib/entrustment";
import { canReviewLogEntry } from "@/lib/log-entry-review";
import { answeredExtraFields } from "@/lib/discipline-template";
import { ReviewForm } from "./review-form";
import { formatDate } from "@/lib/format-date";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Review case" };

export default async function ReviewEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireRole("SUPERVISOR");
  const supervisorProfile = await getSupervisorProfileByUserId(session.user.id);

  const entry = await prisma.logEntry.findUnique({
    where: { id },
    include: {
      student: { include: { user: true } },
      rotation: { include: { clinicalSite: true, program: { include: { disciplineTemplate: true } } } },
      competencies: { include: { competency: true } },
      wardAssignment: true,
    },
  });

  if (!entry || !canReviewLogEntry(entry, supervisorProfile.id) || entry.status !== "SUBMITTED") {
    notFound();
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <DashboardHeader back={{ href: "/supervisor", label: "Pending review" }} title="Review entry" userId={session.user.id} />
      <div className="mx-auto max-w-2xl space-y-6 px-6 py-8">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{entry.caseTitle}</h2>
          <p className="text-sm text-gray-500">
            {entry.student.user.name} · {entry.rotation.clinicalSite.name}
            {(entry.wardName ?? entry.wardAssignment?.wardName) ? ` — ${entry.wardName ?? entry.wardAssignment?.wardName}` : ""} ·{" "}
            {formatDate(entry.occurredAt)}
          </p>
        </div>

        <dl className="space-y-4 rounded-md border border-gray-200 bg-white p-4 text-sm">
          <div>
            <dt className="font-medium text-gray-700">Case category</dt>
            <dd className="text-gray-600">
              {entry.competencies.map((c) => c.competency.name).join(", ") || "—"}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-gray-700">Student&apos;s self-reported level</dt>
            <dd className="text-gray-600">{ENTRUSTMENT_LEVEL_LABELS[entry.studentRole]}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-700">Subjective</dt>
            <dd className="whitespace-pre-wrap text-gray-600">{entry.subjective}</dd>
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
              <p className="whitespace-pre-wrap">{entry.objectiveFindings}</p>
            </dd>
          </div>
          <div>
            <dt className="font-medium text-gray-700">Assessment</dt>
            <dd className="whitespace-pre-wrap text-gray-600">{entry.assessment}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-700">Plan</dt>
            <dd className="whitespace-pre-wrap text-gray-600">{entry.plan}</dd>
          </div>
          {answeredExtraFields(entry.rotation.program.disciplineTemplate.extraLogFields, entry.extraFields).map((f) => (
            <div key={f.key}>
              <dt className="font-medium text-gray-700">{f.label}</dt>
              <dd className="whitespace-pre-wrap text-gray-600">{f.value}</dd>
            </div>
          ))}
        </dl>

        <ReviewForm
          logEntryId={entry.id}
          studentReportedLevel={entry.studentRole}
          userId={session.user.id}
        />

      </div>
    </main>
  );
}
