import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/require-role";
import { getCoordinatorProfileByUserId } from "@/lib/coordinator";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "@/components/dashboard-header";
import { currentRotationWhere } from "@/lib/rotation-status";
import { InviteList } from "./invite-list";

export const metadata: Metadata = { title: "Students" };

// The whole roster: students already on Praxxt (with their current
// placement), then those imported but not yet joined, where invitations
// are sent from.
export default async function StudentsPage() {
  const session = await requireRole("COORDINATOR");
  const coordinatorProfile = await getCoordinatorProfileByUserId(session.user.id);

  const studentProfiles = await prisma.studentProfile.findMany({
    where: { programId: coordinatorProfile.programId },
    include: {
      user: true,
      cohort: true,
      rotations: {
        where: currentRotationWhere(),
        include: { clinicalSite: { select: { name: true } } },
        orderBy: { startDate: "desc" },
        take: 1,
      },
    },
    orderBy: { user: { name: "asc" } },
  });

  const active = studentProfiles.filter((sp) => sp.user.status === "ACTIVE");
  const notJoined = studentProfiles
    .filter((sp) => sp.user.status !== "ACTIVE")
    .map((sp) => ({
      userId: sp.userId,
      studentProfileId: sp.id,
      studentIdNumber: sp.studentIdNumber,
      name: sp.user.name,
      email: sp.user.email,
      status: sp.user.status as "IMPORTED" | "INVITED",
      cohortName: sp.cohort?.name ?? null,
    }));

  return (
    <main className="min-h-screen bg-gray-50">
      <DashboardHeader title="Students" />
      <div className="mx-auto max-w-4xl space-y-8 px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-500">
            Program: {coordinatorProfile.program.name} · {studentProfiles.length} student{studentProfiles.length === 1 ? "" : "s"} (
            {active.length} on Praxxt, {notJoined.length} not joined yet)
          </p>
          <Link href="/coordinator/students/import" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white">
            + Import students (CSV)
          </Link>
        </div>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-gray-900">On Praxxt ({active.length})</h2>
          {active.length === 0 ? (
            <p className="text-sm text-gray-500">No students have joined yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Name</th>
                    <th className="px-4 py-2.5 font-medium">Student ID</th>
                    <th className="px-4 py-2.5 font-medium">Cohort</th>
                    <th className="px-4 py-2.5 font-medium">Current placement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {active.map((sp) => (
                    <tr key={sp.id}>
                      <td className="px-4 py-2.5">
                        <Link href={`/coordinator/students/${sp.id}`} className="font-medium text-blue-600 hover:underline">
                          {sp.user.name}
                        </Link>
                        <p className="text-xs text-gray-500">{sp.user.email}</p>
                      </td>
                      <td className="px-4 py-2.5 text-gray-700">{sp.studentIdNumber}</td>
                      <td className="px-4 py-2.5 text-gray-700">{sp.cohort?.name ?? "—"}</td>
                      <td className="px-4 py-2.5 text-gray-700">{sp.rotations[0]?.clinicalSite.name ?? "None right now"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-gray-900">Not joined yet ({notJoined.length})</h2>
          <InviteList rows={notJoined} />
        </section>
      </div>
    </main>
  );
}
