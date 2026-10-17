import Link from "next/link";
import { notFound } from "next/navigation";
import type { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getMessagingContacts, listConversations, markConversationRead, roleLabel } from "@/lib/messaging";
import { initialOf } from "@/components/portal-shell/portal-shell";
import { BackLink } from "@/components/back-link";
import { AutoRefresh, Avatar, ContactPicker, LocalTime, MessageComposer, MessageList } from "./client";

export type MessagesPane = { kind: "inbox" } | { kind: "new" } | { kind: "conversation"; id: string };

// The messaging screen for every role: conversations on the left and the
// open conversation (or the new-message picker) on the right. On phones
// only one side shows at a time, with a Back button to the list.
export async function MessagesView({
  basePath,
  userId,
  role,
  pane,
}: {
  basePath: string; // e.g. "/student/messages"
  userId: string;
  role: Role;
  pane: MessagesPane;
}) {
  // Mark the open conversation read before counting unread messages, so
  // the list doesn't show a badge on the conversation being read.
  let thread = null;
  if (pane.kind === "conversation") {
    thread = await prisma.conversation.findFirst({
      where: { id: pane.id, participants: { some: { userId } } },
      include: {
        participants: { include: { user: { select: { id: true, name: true, role: true } } } },
        messages: { orderBy: { createdAt: "desc" }, take: 200 },
      },
    });
    if (!thread) notFound();
    await markConversationRead(thread.id, userId);
  }

  const conversations = await listConversations(userId);
  const contacts = pane.kind === "new" ? await getMessagingContacts(userId, role) : [];
  const showingPane = pane.kind !== "inbox";

  return (
    <div className="flex h-[calc(100dvh-12rem)] min-h-[30rem] overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <AutoRefresh />

      <aside
        className={`${showingPane ? "hidden md:flex" : "flex"} w-full flex-col border-gray-200 md:w-80 md:shrink-0 md:border-r`}
        aria-label="Conversations"
      >
        <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-800">Conversations</h2>
          <Link
            href={`${basePath}/new`}
            className="rounded-full bg-blue-600 px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            New message
          </Link>
        </div>
        {conversations.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-gray-500">
            No conversations yet. Start one with <span className="font-medium">New message</span>.
          </p>
        ) : (
          <ul className="flex-1 divide-y divide-gray-100 overflow-y-auto">
            {conversations.map((c) => {
              const active = pane.kind === "conversation" && pane.id === c.id;
              const preview = c.lastMessage
                ? `${c.lastMessage.senderId === userId ? "You: " : ""}${c.lastMessage.body}`
                : "No messages yet";
              return (
                <li key={c.id}>
                  <Link
                    href={`${basePath}/${c.id}`}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-start gap-3 px-4 py-3 ${active ? "bg-blue-50" : "hover:bg-gray-50"}`}
                  >
                    <Avatar initial={initialOf(c.other.name)} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className={`truncate text-sm text-gray-900 ${c.unread ? "font-bold" : "font-medium"}`}>
                          {c.other.name}
                        </span>
                        <span className="shrink-0 text-xs text-gray-400">
                          <LocalTime iso={c.lastMessageAt.toISOString()} format="short" />
                        </span>
                      </span>
                      <span className="flex items-center justify-between gap-2">
                        <span className={`truncate text-xs ${c.unread ? "font-medium text-gray-800" : "text-gray-500"}`}>
                          {preview}
                        </span>
                        {c.unread > 0 && (
                          <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#5A3BF0] px-1.5 text-[11px] font-semibold text-white">
                            {c.unread}
                            <span className="sr-only"> unread</span>
                          </span>
                        )}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </aside>

      <section className={`${showingPane ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col bg-gray-50`}>
        {pane.kind === "inbox" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="text-sm font-medium text-gray-700">Select a conversation</p>
            <p className="max-w-xs text-sm text-gray-500">
              Choose one from the list, or start a new one with <span className="font-medium">New message</span>.
            </p>
          </div>
        )}

        {pane.kind === "new" && (
          <>
            <PaneHeader basePath={basePath}>
              <h2 className="text-sm font-semibold text-gray-900">New message</h2>
            </PaneHeader>
            <ContactPicker
              contacts={contacts.map((c) => ({ id: c.id, name: c.name, detail: c.detail, initial: initialOf(c.name) }))}
            />
          </>
        )}

        {thread &&
          (() => {
            const other = thread.participants.find((p) => p.userId !== userId)!.user;
            return (
              <>
                <PaneHeader basePath={basePath}>
                  <Avatar initial={initialOf(other.name)} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-gray-900">{other.name}</span>
                    <span className="block text-xs text-gray-500">{roleLabel(other.role)}</span>
                  </span>
                </PaneHeader>
                <MessageList
                  messages={[...thread.messages].reverse().map((m) => ({
                    id: m.id,
                    body: m.body,
                    mine: m.senderId === userId,
                    createdAt: m.createdAt.toISOString(),
                  }))}
                />
                <MessageComposer conversationId={thread.id} />
              </>
            );
          })()}
      </section>
    </div>
  );
}

function PaneHeader({ basePath, children }: { basePath: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 sm:px-6">
      <span className="md:hidden">
        <BackLink href={basePath} label="Conversations" />
      </span>
      {children}
    </div>
  );
}
