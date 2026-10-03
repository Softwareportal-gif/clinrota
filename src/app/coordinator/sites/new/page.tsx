import { requireRole } from "@/lib/require-role";
import { DashboardHeader } from "@/components/dashboard-header";
import { SiteForm } from "../site-form";

export default async function NewSitePage() {
  const session = await requireRole("COORDINATOR");

  return (
    <main className="min-h-screen bg-gray-50">
      <DashboardHeader title="Add clinical site" userName={session.user.name ?? ""} />
      <div className="mx-auto max-w-3xl px-6 py-8">
        <SiteForm />
      </div>
    </main>
  );
}
