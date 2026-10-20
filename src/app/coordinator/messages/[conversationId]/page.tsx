import { requireRole } from "@/lib/require-role";
import { DashboardHeader } from "@/components/dashboard-header";
import { MessagesView } from "@/components/messaging/messages-view";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Conversation" };

export default async function CoordinatorMessagesPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const session = await requireRole("COORDINATOR");
  const { conversationId } = await params;

  return (
    <main className="min-h-screen bg-gray-50">
      <DashboardHeader title="Messages" />
      <div className="px-4 py-6 sm:px-6">
        <MessagesView basePath="/coordinator/messages" userId={session.user.id} role="COORDINATOR" pane={{ kind: "conversation", id: conversationId }} />
      </div>
    </main>
  );
}
