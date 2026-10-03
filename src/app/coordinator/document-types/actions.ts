"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";
import { getCoordinatorProfileByUserId } from "@/lib/coordinator";

export type DocTypeState = { error?: string } | undefined;

const schema = z.object({
  name: z.string().trim().min(2, "Enter a name.").max(100),
  description: z.string().trim().max(300).optional(),
});

export async function addDocumentType(
  _prevState: DocTypeState,
  formData: FormData
): Promise<DocTypeState> {
  const session = await requireRole("COORDINATOR");
  const coordinatorProfile = await getCoordinatorProfileByUserId(session.user.id);

  const parsed = schema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const existing = await prisma.requiredDocumentType.findFirst({
    where: { programId: coordinatorProfile.programId, name: parsed.data.name },
  });
  if (existing) {
    if (existing.isActive) return { error: "That document type already exists." };
    await prisma.requiredDocumentType.update({ where: { id: existing.id }, data: { isActive: true } });
  } else {
    await prisma.requiredDocumentType.create({
      data: {
        programId: coordinatorProfile.programId,
        name: parsed.data.name,
        description: parsed.data.description || null,
      },
    });
  }

  revalidatePath("/coordinator/document-types");
}

export async function toggleDocumentTypeActive(
  documentTypeId: string,
  _prevState: DocTypeState,
  _formData: FormData
): Promise<DocTypeState> {
  const session = await requireRole("COORDINATOR");
  const coordinatorProfile = await getCoordinatorProfileByUserId(session.user.id);

  const type = await prisma.requiredDocumentType.findUnique({ where: { id: documentTypeId } });
  if (!type || type.programId !== coordinatorProfile.programId) {
    return { error: "Document type not found." };
  }

  await prisma.requiredDocumentType.update({
    where: { id: documentTypeId },
    data: { isActive: !type.isActive },
  });

  revalidatePath("/coordinator/document-types");
}
