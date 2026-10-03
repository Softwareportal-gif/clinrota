import Link from "next/link";
import { requireRole } from "@/lib/require-role";
import { getCoordinatorProfileByUserId } from "@/lib/coordinator";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "@/components/dashboard-header";
import { InviteList } from "./invite-list";

// The onboarding queue — students who've been imported but haven't
// (fully) come on board yet. Already-ACTIVE students are handled by the
// rest of the coordinator UI (dashboard, coverage report, compliance
// grid, etc.), which link through to /coordinator/students/[id] — this
// page is deliberately scoped to just IMPORTED/INVITED, not a full roster.
export default async function StudentsPage() {
  const session = await requireRole("COORDINATOR");
  const coordinatorProfile = await getCoordinatorProfileByUserId(session.user.id);

  const studentProfiles = await prisma.studentProfile.findMany({
    where: {
      programId: coordinatorProfile.programId,
      user: { status: { in: ["IMPORTED", "INVITED"] } },
    },
    include: { user: true, cohort: true },
    orderBy: { user: { name: "asc" } },
  });

  const rows = studentProfiles.map((sp) => ({
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
      <DashboardHeader title="Student roster" userName={session.user.name ?? ""} />
      <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-500">Program: {coordinatorProfile.program.name}</p>
          <Link
            href="/coordinator/students/import"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white"
          >
            + Import students (CSV)
          </Link>
        </div>

        <InviteList rows={rows} />

        <Link href="/coordinator" className="block text-sm text-gray-500 hover:underline">
          ← Back to dashboard
        </Link>
      </div>
    </main>
  );
}
