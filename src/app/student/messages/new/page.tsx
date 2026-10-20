import { requireRole } from "@/lib/require-role";
import { MessagesView } from "@/components/messaging/messages-view";
import { INK, TEXT_SECONDARY } from "../../dashboard-sections/colors";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "New message" };

export default async function StudentMessagesPage() {
  const session = await requireRole("STUDENT");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold" style={{ color: INK }}>Messages</h1>
        <p className="mt-1 text-sm" style={{ color: TEXT_SECONDARY }}>
          Message your coordinator and supervisors.
        </p>
      </div>
      <MessagesView basePath="/student/messages" userId={session.user.id} role="STUDENT" pane={{ kind: "new" }} />
    </div>
  );
}
