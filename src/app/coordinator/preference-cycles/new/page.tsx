import { requireRole } from "@/lib/require-role";
import { getCoordinatorProfileByUserId } from "@/lib/coordinator";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "@/components/dashboard-header";
import { CycleForm } from "./cycle-form";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Preference cycle" };

export default async function NewPreferenceCyclePage() {
  const session = await requireRole("COORDINATOR");
  const coordinatorProfile = await getCoordinatorProfileByUserId(session.user.id);

  const cohorts = await prisma.cohort.findMany({
    where: { programId: coordinatorProfile.programId },
    orderBy: { startDate: "desc" },
  });

  return (
    <main className="min-h-screen bg-gray-50">
      <DashboardHeader title="New preference cycle" />
      <div className="mx-auto max-w-2xl space-y-6 px-6 py-8">
        <p className="text-sm text-gray-500">
          Opens a rotation-site wishlist for every student in the chosen cohort — they&apos;ll rank
          their preferred clinical sites from their dashboard until the deadline.
        </p>
        {cohorts.length === 0 ? (
          <p className="text-sm text-gray-500">No cohorts in your program yet.</p>
        ) : (
          <CycleForm cohorts={cohorts.map((c) => ({ id: c.id, label: `${c.name} · ${c.academicYear} ${c.term}` }))} />
        )}
      </div>
    </main>
  );
}
