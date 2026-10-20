import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/require-role";
import { getCoordinatorProfileByUserId } from "@/lib/coordinator";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "@/components/dashboard-header";
import { formatDateRange, toDateInputValue } from "@/lib/format-date";
import { LOGGING_GRACE_DAYS, rotationPhase } from "@/lib/rotation-status";
import { PhasePill } from "../phase-pill";
import { RotationActions, RotationEditForm } from "./rotation-controls";

export const metadata: Metadata = { title: "Rotation" };

export default async function RotationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireRole("COORDINATOR");
  const coordinatorProfile = await getCoordinatorProfileByUserId(session.user.id);

  const rotation = await prisma.rotation.findFirst({
    where: { id, programId: coordinatorProfile.programId },
    include: {
      student: { include: { user: { select: { name: true } } } },
      clinicalSite: { include: { departments: { orderBy: { name: "asc" } } } },
      siteDepartment: true,
      supervisor: { include: { user: { select: { name: true } } } },
      _count: { select: { logEntries: true, timesheetEntries: true } },
    },
  });
  if (!rotation) notFound();

  const supervisors = await prisma.supervisorProfile.findMany({
    where: { user: { institutionId: coordinatorProfile.program.institutionId } },
    include: { user: { select: { name: true } } },
    orderBy: { user: { name: "asc" } },
  });
  const phase = rotationPhase(rotation);

  return (
    <main className="min-h-screen bg-gray-50">
      <DashboardHeader title={rotation.student.user.name} back={{ href: "/coordinator/rotations", label: "Rotations" }} />
      <div className="mx-auto max-w-3xl space-y-6 px-6 py-8">
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-base font-semibold text-gray-900">
                {rotation.clinicalSite.name}
                {rotation.siteDepartment ? ` — ${rotation.siteDepartment.name}` : ""}
              </p>
              <p className="mt-1 text-sm text-gray-600">
                {formatDateRange(rotation.startDate, rotation.endDate)} · Supervisor: {rotation.supervisor.user.name}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {rotation._count.logEntries} case{rotation._count.logEntries === 1 ? "" : "s"} logged · {rotation._count.timesheetEntries} timesheet
                {rotation._count.timesheetEntries === 1 ? "" : "s"} ·{" "}
                <Link href={`/coordinator/students/${rotation.studentId}`} className="font-medium text-blue-600 hover:underline">
                  Student record
                </Link>
              </p>
            </div>
            <PhasePill phase={phase} />
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Change this rotation</h2>
          <RotationEditForm
            rotationId={rotation.id}
            supervisors={supervisors.map((s) => ({ id: s.id, name: s.user.name }))}
            wards={rotation.clinicalSite.departments.map((d) => ({ id: d.id, name: d.name }))}
            initial={{
              supervisorId: rotation.supervisorId,
              siteDepartmentId: rotation.siteDepartmentId ?? "",
              startDate: toDateInputValue(rotation.startDate),
              endDate: toDateInputValue(rotation.endDate),
            }}
          />
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-900">End or cancel</h2>
          <p className="mb-4 mt-1 text-sm text-gray-600">
            Students can log cases and hours from the start date until {LOGGING_GRACE_DAYS} days after the end date. Ending
            early sets the end date to today; cancelling stops all logging. Logged work is always kept.
          </p>
          <RotationActions
            rotationId={rotation.id}
            canEnd={phase === "ACTIVE"}
            canCancel={phase !== "CANCELLED"}
            canRestore={phase === "CANCELLED"}
          />
        </section>
      </div>
    </main>
  );
}
