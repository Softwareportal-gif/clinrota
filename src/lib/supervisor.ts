import { prisma } from "@/lib/prisma";

export async function getSupervisorProfileByUserId(userId: string) {
  return prisma.supervisorProfile.findUniqueOrThrow({
    where: { userId },
  });
}
