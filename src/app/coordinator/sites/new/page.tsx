import { requireRole } from "@/lib/require-role";
import { DashboardHeader } from "@/components/dashboard-header";
import { SiteForm } from "../site-form";

export default async function NewSitePage() {
  await requireRole("COORDINATOR");

  return (
    <main className="min-h-screen bg-gray-50">
      <DashboardHeader back={{ href: "/coordinator/sites", label: "Clinical sites" }} title="Add clinical site" />
      <div className="mx-auto max-w-3xl px-6 py-8">
        <SiteForm />
      </div>
    </main>
  );
}
