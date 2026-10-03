import { requireRole } from "@/lib/require-role";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "@/components/dashboard-header";
import { ProgramForm } from "./program-form";

export default async function NewProgramPage() {
  const session = await requireRole("SUPER_ADMIN");

  const templates = await prisma.disciplineTemplate.findMany({ orderBy: { name: "asc" } });

  return (
    <main className="min-h-screen bg-gray-50">
      <DashboardHeader title="New program" userName={session.user.name ?? ""} />
      <div className="mx-auto max-w-xl space-y-6 px-6 py-8">
        <ProgramForm templates={templates} />
      </div>
    </main>
  );
}
