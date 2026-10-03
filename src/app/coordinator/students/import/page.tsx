import Link from "next/link";
import { requireRole } from "@/lib/require-role";
import { DashboardHeader } from "@/components/dashboard-header";
import { ImportForm } from "./import-form";

export default async function ImportStudentsPage() {
  const session = await requireRole("COORDINATOR");

  return (
    <main className="min-h-screen bg-gray-50">
      <DashboardHeader title="Import students" userName={session.user.name ?? ""} />
      <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
        <p className="text-sm text-gray-500">
          Upload a CSV of students to add to your program. This only creates the records —
          nobody is emailed until you send invitations from the student roster afterward.
        </p>
        <ImportForm />
        <Link href="/coordinator/students" className="block text-sm text-gray-500 hover:underline">
          ← Back to student roster
        </Link>
      </div>
    </main>
  );
}
