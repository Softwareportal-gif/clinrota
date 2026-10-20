import { requireRole } from "@/lib/require-role";
import { getStudentProfileByUserId } from "@/lib/student";
import { prisma } from "@/lib/prisma";
import { TimesheetForm } from "./timesheet-form";
import { TimesheetList } from "./timesheet-list";
import { INK, TEXT_SECONDARY } from "../dashboard-sections/colors";
import { loggableRotationWhere } from "@/lib/rotation-status";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Timesheets" };

export default async function StudentTimesheetsPage() {
  const session = await requireRole("STUDENT");
  const studentProfile = await getStudentProfileByUserId(session.user.id);

  const [rotation, entries] = await Promise.all([
    prisma.rotation.findFirst({
      where: { studentId: studentProfile.id, ...loggableRotationWhere() },
    }),
    prisma.timesheetEntry.findMany({
      where: { studentId: studentProfile.id },
      include: { rotation: { include: { clinicalSite: { select: { name: true } } } } },
      orderBy: { shiftDate: "desc" },
    }),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold" style={{ color: INK }}>Timesheets</h1>
        <p className="mt-1 text-sm" style={{ color: TEXT_SECONDARY }}>
          Log the hours you worked on each shift. Your supervisor approves them, and approved hours count toward your rotation.
        </p>
      </div>
      {!rotation ? (
        <p className="text-sm" style={{ color: TEXT_SECONDARY }}>You have no active rotation to log hours against.</p>
      ) : (
        <TimesheetForm rotationId={rotation.id} userId={session.user.id} />
      )}
      <TimesheetList
        serverEntries={entries.map((e) => ({
          id: e.id,
          shiftDate: e.shiftDate,
          hours: e.hours,
          status: e.status,
          siteName: e.rotation.clinicalSite.name,
        }))}
        userId={session.user.id}
      />
    </div>
  );
}
