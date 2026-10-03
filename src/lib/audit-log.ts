import { prisma } from "@/lib/prisma";

export async function logAudit(params: {
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  afterData?: object;
}) {
  await prisma.auditLog.create({
    data: {
      actorId: params.actorId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      afterData: params.afterData,
    },
  });
}
