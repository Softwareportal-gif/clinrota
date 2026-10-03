import { prisma } from "@/lib/prisma";

// SUPER_ADMIN has no separate profile model (unlike Student/Supervisor/
// Coordinator) — institutionId lives directly on User, so this is a plain
// lookup rather than a `*Profile` fetch.
export async function getInstitutionIdForUser(userId: string): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { institutionId: true },
  });
  return user.institutionId;
}
