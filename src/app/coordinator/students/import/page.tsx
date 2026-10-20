import { requireRole } from "@/lib/require-role";
import { getCoordinatorProfileByUserId } from "@/lib/coordinator";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "@/components/dashboard-header";
import { currentAcademicYear, toDateInputValue } from "@/lib/cohorts";
import { ImportForm } from "./import-form";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Import students" };

export default async function ImportStudentsPage() {
  const session = await requireRole("COORDINATOR");
  const coordinatorProfile = await getCoordinatorProfileByUserId(session.user.id);

  // Levels created from an import default to the latest cohort's term and
  // dates, the same defaults as the Cohorts page.
  const latest = await prisma.cohort.findFirst({
    where: { programId: coordinatorProfile.programId },
    orderBy: { startDate: "desc" },
  });
  const cohortDefaults = latest
    ? {
        academicYear: latest.academicYear,
        term: latest.term,
        startDate: toDateInputValue(latest.startDate),
        endDate: toDateInputValue(latest.endDate),
      }
    : { academicYear: currentAcademicYear(), term: "Semester 1", startDate: "", endDate: "" };

  return (
    <main className="min-h-screen bg-gray-50">
      <DashboardHeader back={{ href: "/coordinator/students", label: "Students" }} title="Import students" />
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
        <div className="space-y-2 text-sm text-gray-600">
          <p>
            Upload one CSV with all your students, across every level. Columns: <b>first name</b>,{" "}
            <b>last name</b>, <b>email</b>, <b>level</b> (e.g. Level 100) and, optionally, the school&apos;s{" "}
            <b>student ID</b>. Download the template to start from the right layout.
          </p>
          <p className="text-gray-500">
            Nothing is emailed yet — you send invitations from the student roster afterwards.
          </p>
        </div>
        <ImportForm cohortDefaults={cohortDefaults} />
      </div>
    </main>
  );
}
