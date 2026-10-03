import { prisma } from "@/lib/prisma";

export async function getCoordinatorProfileByUserId(userId: string) {
  return prisma.coordinatorProfile.findUniqueOrThrow({
    where: { userId },
    include: { program: true },
  });
}
