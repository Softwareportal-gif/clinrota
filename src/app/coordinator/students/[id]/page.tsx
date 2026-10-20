import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole } from "@/lib/require-role";
import { getCoordinatorProfileByUserId } from "@/lib/coordinator";
import { getStudentRecordData } from "@/lib/student-record";
import { DashboardHeader } from "@/components/dashboard-header";
import { Badge } from "@/components/badge";
import { StatusBadge } from "@/components/status-badge";
import { RecalculateScoreButton } from "@/components/recalculate-score-button";
import { COVERAGE_STATUS_LABELS, COVERAGE_STATUS_BADGE_CLASSES } from "@/lib/coverage-status";
import { DOC_STATUS_LABELS, DOC_STATUS_BADGE_CLASSES, isCompliant } from "@/lib/compliance-status";
import type { LogEntryStatus } from "@/generated/prisma/client";
import { rotationPhase, rotationPhaseLabel } from "@/lib/rotation-status";
import { formatDate } from "@/lib/format-date";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Student record" };

function fmtDate(d: Date) {
  return formatDate(d);
}

function fmtPercent(n: number | null) {
  return n === null ? "—" : `${n.toFixed(1)}%`;
}

export default async function StudentRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireRole("COORDINATOR");
  const coordinatorProfile = await getCoordinatorProfileByUserId(session.user.id);

  const data = await getStudentRecordData(id);
  if (!data || data.student.programId !== coordinatorProfile.programId) notFound();

  const { student, rotations, logbookCounts, totalLogEntries, coverage, compliance } = data;
  const compliantCount = compliance.filter((c) => isCompliant(c.status)).length;

  return (
    <main className="min-h-screen bg-gray-50">
      <DashboardHeader back={{ href: "/coordinator/students", label: "Students" }} title={student.user.name} />
      <div className="mx-auto max-w-4xl space-y-8 px-6 py-8">
        <div className="flex flex-wrap items-start justify-between gap-4 rounded-md border border-gray-200 bg-white p-4">
          <dl className="grid min-w-0 flex-1 grid-cols-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <dt className="text-xs text-gray-400">Student ID</dt>
              <dd className="text-gray-900">{student.studentIdNumber}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400">Program</dt>
              <dd className="text-gray-900">{student.program.name}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400">Cohort</dt>
              <dd className="text-gray-900">
                {student.cohort
                  ? `${student.cohort.name} · ${student.cohort.academicYear} ${student.cohort.term}`
                  : "—"}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs text-gray-400">Email</dt>
              <dd className="text-gray-900 [overflow-wrap:anywhere]">
                {/* Prefer wrapping a long address at the @ over mid-word. */}
                {student.user.email.split("@")[0]}
                <wbr />@{student.user.email.split("@").slice(1).join("@")}
              </dd>
            </div>
          </dl>
          <a
            href={`/coordinator/students/${student.id}/pdf`}
            className="shrink-0 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700"
          >
            Download PDF
          </a>
        </div>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Placement / rotation history</h2>
          {rotations.length === 0 ? (
            <p className="text-sm text-gray-500">No rotations assigned yet.</p>
          ) : (
            <ul className="space-y-3">
              {rotations.map((rotation) => {
                const finalEvaluation = rotation.competencyEvaluations.find(
                  (e) => e.status === "SUBMITTED"
                );
                const draftEvaluation = rotation.competencyEvaluations.find(
                  (e) => e.status === "DRAFT"
                );
                return (
                  <li key={rotation.id} className="rounded-md border border-gray-200 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {rotation.clinicalSite.name}
                          {rotation.siteDepartment ? ` — ${rotation.siteDepartment.name}` : ""}
                        </p>
                        <p className="text-xs text-gray-500">
                          {fmtDate(rotation.startDate)} – {fmtDate(rotation.endDate)} · Supervisor:{" "}
                          {rotation.supervisor.user.name}
                        </p>
                      </div>
                      <Badge
                        label={rotationPhaseLabel(rotationPhase(rotation))}
                        className="bg-gray-100 text-gray-700"
                      />
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-3 border-t border-gray-100 pt-3 text-xs sm:grid-cols-3">
                      <div>
                        <p className="font-medium text-gray-500">Hours</p>
                        <p className="text-gray-900">
                          {rotation.hours.completedHours.toFixed(1)}
                          {rotation.hours.requiredHours !== null
                            ? ` / ${rotation.hours.requiredHours} required`
                            : " logged (no requirement set)"}
                        </p>
                      </div>

                      <div>
                        <p className="font-medium text-gray-500">Evaluation</p>
                        {finalEvaluation ? (
                          <p className="text-gray-900">
                            {fmtPercent(rotation.evaluationPercent)} ·{" "}
                            <Link
                              href={`/coordinator/students/${student.id}/evaluations/${finalEvaluation.id}`}
                              className="text-blue-600 hover:underline"
                            >
                              Full breakdown
                            </Link>
                          </p>
                        ) : draftEvaluation ? (
                          <p className="text-gray-500">In progress (not finalized)</p>
                        ) : (
                          <p className="text-gray-500">No evaluation yet</p>
                        )}
                      </div>

                      <div>
                        <p className="font-medium text-gray-500">Rotation score</p>
                        {rotation.rotationScore ? (
                          <p className="text-gray-900">
                            {rotation.rotationScore.finalScore.toFixed(1)}% ·{" "}
                            {rotation.rotationScore.passed ? "Pass" : "Fail"}
                            {rotation.rotationScore.isOverridden ? " (overridden)" : ""} ·{" "}
                            <Link
                              href={`/coordinator/scores/${rotation.id}`}
                              className="text-blue-600 hover:underline"
                            >
                              Detail
                            </Link>
                          </p>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">Not yet calculated</span>
                            <RecalculateScoreButton rotationId={rotation.id} hasScore={false} />
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Logbook summary</h2>
            <Link
              href={`/coordinator/students/${student.id}/logbook`}
              className="text-sm text-blue-600 hover:underline"
            >
              View full logbook →
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-3 rounded-md border border-gray-200 bg-white p-4">
            <span className="text-sm text-gray-500">{totalLogEntries} total entries</span>
            {(Object.keys(logbookCounts) as LogEntryStatus[]).map((status) => (
              <span key={status} className="flex items-center gap-1.5 text-sm">
                <StatusBadge status={status} />
                <span className="text-gray-600">{logbookCounts[status]}</span>
              </span>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Competency coverage</h2>
            <span className="text-sm text-gray-500">{fmtPercent(coverage.percent)} met</span>
          </div>
          {coverage.items.length === 0 ? (
            <p className="text-sm text-gray-500">No required competencies configured for this program.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">Competency</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">Highest level reached</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {coverage.items.map((item) => (
                    <tr key={item.competencyId}>
                      <td className="whitespace-nowrap px-4 py-2 font-medium text-gray-900">
                        {item.competencyName}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-gray-600">
                        {item.highestLevelValue ?? "—"} / {item.minLevelValue} required
                      </td>
                      <td className="whitespace-nowrap px-4 py-2">
                        <Badge
                          label={COVERAGE_STATUS_LABELS[item.status]}
                          className={COVERAGE_STATUS_BADGE_CLASSES[item.status]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Compliance status</h2>
            <span className="text-sm text-gray-500">
              {compliantCount} / {compliance.length} verified
            </span>
          </div>
          {compliance.length === 0 ? (
            <p className="text-sm text-gray-500">No required document types configured for this program.</p>
          ) : (
            <ul className="divide-y divide-gray-200 rounded-md border border-gray-200 bg-white">
              {compliance.map((doc) => (
                <li
                  key={doc.requiredDocumentTypeId}
                  className="flex items-center justify-between px-4 py-3 text-sm"
                >
                  <span className="text-gray-900">{doc.name}</span>
                  <Badge label={DOC_STATUS_LABELS[doc.status]} className={DOC_STATUS_BADGE_CLASSES[doc.status]} />
                </li>
              ))}
            </ul>
          )}
        </section>

      </div>
    </main>
  );
}
