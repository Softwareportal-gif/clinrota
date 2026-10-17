import { requireRole } from "@/lib/require-role";
import { DashboardHeader } from "@/components/dashboard-header";
import { MessagesView } from "@/components/messaging/messages-view";

export default async function CoordinatorMessagesPage() {
  const session = await requireRole("COORDINATOR");

  return (
    <main className="min-h-screen bg-gray-50">
      <DashboardHeader title="Messages" />
      <div className="px-4 py-6 sm:px-6">
        <MessagesView basePath="/coordinator/messages" userId={session.user.id} role="COORDINATOR" pane={{ kind: "new" }} />
      </div>
    </main>
  );
}
