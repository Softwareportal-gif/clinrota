import { requireRole } from "@/lib/require-role";
import { getSupervisorProfileByUserId } from "@/lib/supervisor";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "@/components/dashboard-header";
import { DecideButtons } from "./decide-button";
import { formatDate } from "@/lib/format-date";
import { TIMESHEET_STATUS_CLASSES, TIMESHEET_STATUS_LABELS } from "@/lib/timesheet-status";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Timesheets" };

export default async function SupervisorTimesheetsPage() {
  const session = await requireRole("SUPERVISOR");
  const supervisorProfile = await getSupervisorProfileByUserId(session.user.id);

  const entries = await prisma.timesheetEntry.findMany({
    where: { rotation: { supervisorId: supervisorProfile.id } },
    include: { student: { include: { user: true } }, rotation: { include: { clinicalSite: { select: { name: true } } } } },
    orderBy: { shiftDate: "desc" },
  });

  return (
    <main className="min-h-screen bg-gray-50">
      <DashboardHeader title="Timesheets" userId={session.user.id} />
      <div className="mx-auto max-w-3xl px-6 py-8">
        {entries.length === 0 ? (
          <p className="text-sm text-gray-500">No timesheet entries yet.</p>
        ) : (
          <ul className="divide-y divide-gray-200 rounded-md border border-gray-200 bg-white">
            {entries.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {entry.student.user.name} · {formatDate(entry.shiftDate)} ·{" "}
                    {entry.hours.toFixed(1)}h
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <span>{entry.rotation.clinicalSite.name}</span>
                    <span className={`rounded-full px-2 py-0.5 font-semibold ${TIMESHEET_STATUS_CLASSES[entry.status]}`}>
                      {TIMESHEET_STATUS_LABELS[entry.status]}
                    </span>
                  </p>
                </div>
                {entry.status === "PENDING" && <DecideButtons timesheetId={entry.id} />}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
