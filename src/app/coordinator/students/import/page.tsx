import { requireRole } from "@/lib/require-role";
import { DashboardHeader } from "@/components/dashboard-header";
import { ImportForm } from "./import-form";

export default async function ImportStudentsPage() {
  await requireRole("COORDINATOR");

  return (
    <main className="min-h-screen bg-gray-50">
      <DashboardHeader back={{ href: "/coordinator/students", label: "Students" }} title="Import students" />
      <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
        <p className="text-sm text-gray-500">
          Upload a CSV of students to add to your program. This only creates the records —
          nobody is emailed until you send invitations from the student roster afterward.
        </p>
        <ImportForm />
      </div>
    </main>
  );
}
