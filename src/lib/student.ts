import { prisma } from "@/lib/prisma";

export async function getStudentProfileByUserId(userId: string) {
  return prisma.studentProfile.findUniqueOrThrow({
    where: { userId },
    include: { program: { include: { disciplineTemplate: true } }, cohort: true, user: true },
  });
}
