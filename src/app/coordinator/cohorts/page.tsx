import Link from "next/link";
import { requireRole } from "@/lib/require-role";
import { getCoordinatorProfileByUserId } from "@/lib/coordinator";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "@/components/dashboard-header";
import { currentAcademicYear, toDateInputValue } from "@/lib/cohorts";
import { AddCohortsForm, EditCohortForm } from "./cohort-forms";

export default async function CohortsPage() {
  const session = await requireRole("COORDINATOR");
  const coordinatorProfile = await getCoordinatorProfileByUserId(session.user.id);

  const cohorts = await prisma.cohort.findMany({
    where: { programId: coordinatorProfile.programId },
    include: {
      _count: { select: { studentProfiles: true, rotations: true, studentImportBatches: true, preferenceCycles: true } },
    },
    orderBy: [{ startDate: "desc" }, { name: "asc" }],
  });

  // New cohorts default to the most recent cohort's term and dates (most
  // schools add all their levels for the same term), else this academic year.
  const latest = cohorts[0];
  const defaults = latest
    ? {
        academicYear: latest.academicYear,
        term: latest.term,
        startDate: toDateInputValue(latest.startDate),
        endDate: toDateInputValue(latest.endDate),
      }
    : { academicYear: currentAcademicYear(), term: "Semester 1", startDate: "", endDate: "" };

  return (
    <main className="min-h-screen bg-gray-50">
      <DashboardHeader title="Cohorts" />
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6">
        <p className="text-sm text-gray-600">
          Cohorts are {coordinatorProfile.program.name}&apos;s class groups, usually its year levels. Students are
          placed in a cohort when they&apos;re added, and you can filter and assign rotations by cohort.{" "}
          <Link href="/coordinator/students/import" className="font-medium text-blue-600 hover:underline">
            Importing students
          </Link>{" "}
          can also create any levels your spreadsheet mentions.
        </p>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Add cohorts</h2>
          <AddCohortsForm defaults={defaults} />
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-gray-700">
            {cohorts.length} cohort{cohorts.length === 1 ? "" : "s"}
          </h2>
          {cohorts.length === 0 ? (
            <p className="text-sm text-gray-500">No cohorts yet. Add your levels above.</p>
          ) : (
            <ul className="divide-y divide-gray-200 rounded-md border border-gray-200 bg-white">
              {cohorts.map((c) => (
                <li key={c.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-medium text-gray-900">{c.name}</p>
                    <p className="text-xs text-gray-500">
                      {c._count.studentProfiles} student{c._count.studentProfiles === 1 ? "" : "s"} ·{" "}
                      {c._count.rotations} rotation{c._count.rotations === 1 ? "" : "s"}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500">
                    {c.academicYear} · {c.term} · {c.startDate.toLocaleDateString()} – {c.endDate.toLocaleDateString()}
                  </p>
                  <EditCohortForm
                    cohortId={c.id}
                    name={c.name}
                    defaults={{
                      academicYear: c.academicYear,
                      term: c.term,
                      startDate: toDateInputValue(c.startDate),
                      endDate: toDateInputValue(c.endDate),
                    }}
                    deletable={Object.values(c._count).every((n) => n === 0)}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
