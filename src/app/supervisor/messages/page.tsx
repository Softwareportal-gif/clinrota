import { requireRole } from "@/lib/require-role";
import { DashboardHeader } from "@/components/dashboard-header";
import { MessagesView } from "@/components/messaging/messages-view";

export default async function SupervisorMessagesPage() {
  const session = await requireRole("SUPERVISOR");

  return (
    <main className="min-h-screen bg-gray-50">
      <DashboardHeader title="Messages" userId={session.user.id} />
      <div className="px-4 py-6 sm:px-6">
        <MessagesView basePath="/supervisor/messages" userId={session.user.id} role="SUPERVISOR" pane={{ kind: "inbox" }} />
      </div>
    </main>
  );
}
