import { PrismaClient } from "../src/generated/prisma/client";

// A short demo conversation between student1 and their supervisor, so the
// Messages screen has something in it. Like seedProfessionDemos it runs on
// every demo deploy and does nothing once the conversation exists (or if
// the demo accounts don't).
export async function seedDemoMessages(prisma: PrismaClient): Promise<void> {
  const [student, supervisor] = await Promise.all([
    prisma.user.findUnique({ where: { email: "student1@praxxt.demo" } }),
    prisma.user.findUnique({ where: { email: "supervisor1@praxxt.demo" } }),
  ]);
  if (!student || !supervisor) return;

  const pairKey = [student.id, supervisor.id].sort().join(":");
  if (await prisma.conversation.findUnique({ where: { pairKey } })) return;

  const sentAt = (minutesAgo: number) => new Date(Date.now() - minutesAgo * 60 * 1000);
  const messages = [
    { senderId: student.id, body: "Good morning. Could I observe the IV cannulation on the ward round tomorrow?", createdAt: sentAt(95) },
    { senderId: supervisor.id, body: "Yes, meet me at the nurses' station at 8am. Review the aseptic technique checklist before then.", createdAt: sentAt(80) },
    { senderId: student.id, body: "Thank you, I will. I've also submitted yesterday's wound dressing case for your review.", createdAt: sentAt(20) },
  ];
  await prisma.conversation.create({
    data: {
      pairKey,
      lastMessageAt: messages[messages.length - 1].createdAt,
      participants: {
        create: [
          { userId: student.id, lastReadAt: messages[messages.length - 1].createdAt },
          // The supervisor hasn't read the student's latest message yet.
          { userId: supervisor.id, lastReadAt: messages[1].createdAt },
        ],
      },
      messages: { create: messages },
    },
  });
  console.log("  Added a demo conversation: student1 ↔ supervisor1");
}
