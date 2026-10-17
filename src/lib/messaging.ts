import { prisma } from "@/lib/prisma";
import type { Role } from "@/generated/prisma/client";

export type MessagingContact = {
  id: string;
  name: string;
  role: Role;
  // Why this person is a contact, e.g. "Coordinator · BSc Nursing".
  detail: string;
};

const ROLE_LABEL: Record<Role, string> = {
  STUDENT: "Student",
  SUPERVISOR: "Supervisor",
  COORDINATOR: "Coordinator",
  SUPER_ADMIN: "Administrator",
};

export function roleLabel(role: Role) {
  return ROLE_LABEL[role];
}

// Who a user may start a conversation with, scoped to people they already
// work with:
// - a student: their program's coordinators and the supervisors of their
//   rotations;
// - a supervisor: the students they supervise and those students'
//   coordinators;
// - a coordinator: their program's students, the supervisors on its
//   rotations and its other coordinators.
// Super admins have no messaging. Deactivated accounts are never contacts.
export async function getMessagingContacts(userId: string, role: Role): Promise<MessagingContact[]> {
  const contacts = new Map<string, MessagingContact>();
  const add = (c: MessagingContact) => {
    if (c.id !== userId && !contacts.has(c.id)) contacts.set(c.id, c);
  };
  const activeUser = { isActive: true };

  if (role === "STUDENT") {
    const student = await prisma.studentProfile.findUnique({ where: { userId }, include: { program: true } });
    if (!student) return [];
    const [coordinators, rotations] = await Promise.all([
      prisma.user.findMany({ where: { ...activeUser, coordinatorProfile: { programId: student.programId } } }),
      prisma.rotation.findMany({
        where: { studentId: student.id, supervisor: { user: activeUser } },
        include: { clinicalSite: true, supervisor: { include: { user: true } } },
        orderBy: { startDate: "desc" },
      }),
    ]);
    for (const u of coordinators) add({ id: u.id, name: u.name, role: u.role, detail: `Coordinator · ${student.program.name}` });
    for (const r of rotations) {
      const u = r.supervisor.user;
      add({ id: u.id, name: u.name, role: u.role, detail: `Supervisor · ${r.clinicalSite.name}` });
    }
  } else if (role === "SUPERVISOR") {
    const supervisor = await prisma.supervisorProfile.findUnique({ where: { userId } });
    if (!supervisor) return [];
    const rotations = await prisma.rotation.findMany({
      where: { supervisorId: supervisor.id, student: { user: activeUser } },
      include: { clinicalSite: true, program: true, student: { include: { user: true } } },
      orderBy: { startDate: "desc" },
    });
    for (const r of rotations) {
      const u = r.student.user;
      add({ id: u.id, name: u.name, role: u.role, detail: `Student · ${r.program.name} · ${r.clinicalSite.name}` });
    }
    const programIds = [...new Set(rotations.map((r) => r.programId))];
    const coordinators = await prisma.user.findMany({
      where: { ...activeUser, coordinatorProfile: { programId: { in: programIds } } },
      include: { coordinatorProfile: { include: { program: true } } },
    });
    for (const u of coordinators) {
      add({ id: u.id, name: u.name, role: u.role, detail: `Coordinator · ${u.coordinatorProfile!.program.name}` });
    }
  } else if (role === "COORDINATOR") {
    const coordinator = await prisma.coordinatorProfile.findUnique({ where: { userId }, include: { program: true } });
    if (!coordinator) return [];
    const programId = coordinator.programId;
    const [students, rotations, coordinators] = await Promise.all([
      prisma.user.findMany({ where: { ...activeUser, studentProfile: { programId } }, include: { studentProfile: true } }),
      prisma.rotation.findMany({
        where: { programId, supervisor: { user: activeUser } },
        include: { clinicalSite: true, supervisor: { include: { user: true } } },
        orderBy: { startDate: "desc" },
      }),
      prisma.user.findMany({ where: { ...activeUser, coordinatorProfile: { programId } } }),
    ]);
    for (const u of students) add({ id: u.id, name: u.name, role: u.role, detail: `Student · ${u.studentProfile!.studentIdNumber}` });
    for (const r of rotations) {
      const u = r.supervisor.user;
      add({ id: u.id, name: u.name, role: u.role, detail: `Supervisor · ${r.clinicalSite.name}` });
    }
    for (const u of coordinators) add({ id: u.id, name: u.name, role: u.role, detail: `Coordinator · ${coordinator.program.name}` });
  }

  return [...contacts.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function markConversationRead(conversationId: string, userId: string) {
  await prisma.conversationParticipant.update({
    where: { conversationId_userId: { conversationId, userId } },
    data: { lastReadAt: new Date() },
  });
}

export function pairKeyFor(a: string, b: string) {
  return [a, b].sort().join(":");
}

// A participant's conversations, newest activity first, with the other
// person, the latest message and how many messages from them are unread.
export async function listConversations(userId: string) {
  const conversations = await prisma.conversation.findMany({
    where: { participants: { some: { userId } } },
    include: {
      participants: { include: { user: { select: { id: true, name: true, role: true } } } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { lastMessageAt: "desc" },
  });
  const unread = await unreadCountsByConversation(userId);
  return conversations.map((c) => ({
    id: c.id,
    other: c.participants.find((p) => p.userId !== userId)!.user,
    lastMessage: c.messages[0] ?? null,
    lastMessageAt: c.lastMessageAt,
    unread: unread.get(c.id) ?? 0,
  }));
}

// Unread = sent by someone else after this user last read the
// conversation. A column-to-column comparison, so plain SQL rather than a
// Prisma filter; both values are bound parameters.
async function unreadCountsByConversation(userId: string): Promise<Map<string, number>> {
  const rows = await prisma.$queryRaw<{ conversationId: string; count: bigint }[]>`
    SELECT m."conversationId", COUNT(*) AS count
    FROM "Message" m
    JOIN "ConversationParticipant" p
      ON p."conversationId" = m."conversationId" AND p."userId" = ${userId}
    WHERE m."senderId" <> ${userId}
      AND (p."lastReadAt" IS NULL OR m."createdAt" > p."lastReadAt")
    GROUP BY m."conversationId"`;
  return new Map(rows.map((r) => [r.conversationId, Number(r.count)]));
}

export async function totalUnreadMessages(userId: string): Promise<number> {
  let total = 0;
  for (const count of (await unreadCountsByConversation(userId)).values()) total += count;
  return total;
}
