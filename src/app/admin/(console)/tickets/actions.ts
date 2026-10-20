"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/require-role";
import { prisma } from "@/lib/prisma";

export type ResolveTicketState = { error?: string } | undefined;

export async function resolveTicket(
  ticketId: string,
  _prevState: ResolveTicketState,
  _formData: FormData
): Promise<ResolveTicketState> {
  await requireRole("SUPER_ADMIN");
  await prisma.supportTicket.update({
    where: { id: ticketId },
    data: { status: "RESOLVED", resolvedAt: new Date() },
  });
  revalidatePath("/admin/tickets");
  return undefined;
}
