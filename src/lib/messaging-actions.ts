"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ROLE_HOME } from "@/lib/role-routes";
import { getMessagingContacts, pairKeyFor } from "@/lib/messaging";
import { MAX_MESSAGE_LENGTH } from "@/lib/messaging-limits";
import { consume, LIMITS } from "@/lib/rate-limit";

async function requireMessagingUser() {
  const session = await auth();
  const user = session?.user;
  if (!user?.id || !user.role || user.role === "SUPER_ADMIN") redirect("/login");
  return { id: user.id, role: user.role };
}

// Opens the conversation with a contact, creating it the first time.
// The contact must be someone getMessagingContacts allows, whatever id the
// client sends.
export async function startConversation(contactId: string): Promise<void> {
  const me = await requireMessagingUser();
  const contacts = await getMessagingContacts(me.id, me.role);
  if (!contacts.some((c) => c.id === contactId)) redirect(`${ROLE_HOME[me.role]}/messages`);

  const pairKey = pairKeyFor(me.id, contactId);
  let conversation = await prisma.conversation.findUnique({ where: { pairKey } });
  if (!conversation) {
    try {
      conversation = await prisma.conversation.create({
        data: { pairKey, participants: { create: [{ userId: me.id }, { userId: contactId }] } },
      });
    } catch {
      // Both people opened it at the same moment and the other request won
      // the unique pairKey; use theirs.
      conversation = await prisma.conversation.findUniqueOrThrow({ where: { pairKey } });
    }
  }
  redirect(`${ROLE_HOME[me.role]}/messages/${conversation.id}`);
}

export type SendMessageState = { ok: true; sentAt: number } | { ok: false; error: string } | undefined;

export async function sendMessage(
  conversationId: string,
  _prevState: SendMessageState,
  formData: FormData
): Promise<SendMessageState> {
  const me = await requireMessagingUser();
  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId: me.id } },
  });
  if (!participant) return { ok: false, error: "This conversation isn't available." };

  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { ok: false, error: "Write a message first." };
  if (body.length > MAX_MESSAGE_LENGTH) {
    return { ok: false, error: `Messages can be up to ${MAX_MESSAGE_LENGTH} characters.` };
  }

  if (!(await consume(`message:user:${me.id}`, LIMITS.message))) {
    return { ok: false, error: "You're sending messages very quickly. Wait a few minutes and try again." };
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.message.create({ data: { conversationId, senderId: me.id, body, createdAt: now } }),
    prisma.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: now } }),
    // Your own message is never unread for you.
    prisma.conversationParticipant.update({ where: { id: participant.id }, data: { lastReadAt: now } }),
  ]);

  refresh();
  return { ok: true, sentAt: now.getTime() };
}
