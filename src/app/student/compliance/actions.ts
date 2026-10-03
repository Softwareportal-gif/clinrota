"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";
import { getStudentProfileByUserId } from "@/lib/student";
import { saveUploadedFile } from "@/lib/upload";

export type UploadState = { error?: string; success?: boolean } | undefined;

export async function uploadComplianceDocument(
  requiredDocumentTypeId: string,
  _prevState: UploadState,
  formData: FormData
): Promise<UploadState> {
  const session = await requireRole("STUDENT");
  const studentProfile = await getStudentProfileByUserId(session.user.id);

  const docType = await prisma.requiredDocumentType.findFirst({
    where: { id: requiredDocumentTypeId, programId: studentProfile.programId, isActive: true },
  });
  if (!docType) return { error: "That document type is not available." };

  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "Choose a file to upload." };

  const issueDateRaw = formData.get("issueDate");
  const expiryDateRaw = formData.get("expiryDate");
  const issueDate = issueDateRaw ? new Date(String(issueDateRaw)) : null;
  const expiryDate = expiryDateRaw ? new Date(String(expiryDateRaw)) : null;
  if (issueDateRaw && Number.isNaN(issueDate?.getTime())) {
    return { error: "Enter a valid issue date." };
  }
  if (expiryDateRaw && Number.isNaN(expiryDate?.getTime())) {
    return { error: "Enter a valid expiry date." };
  }

  const saved = await saveUploadedFile(file, "compliance");
  if ("error" in saved) return { error: saved.error };

  await prisma.complianceDocument.upsert({
    where: {
      studentId_requiredDocumentTypeId: {
        studentId: studentProfile.id,
        requiredDocumentTypeId,
      },
    },
    create: {
      studentId: studentProfile.id,
      requiredDocumentTypeId,
      fileUrl: saved.url,
      issueDate,
      expiryDate,
      verificationStatus: "PENDING_VERIFICATION",
    },
    update: {
      fileUrl: saved.url,
      issueDate,
      expiryDate,
      verificationStatus: "PENDING_VERIFICATION",
      rejectionReason: null,
      verifiedById: null,
      verifiedAt: null,
    },
  });

  revalidatePath("/student/compliance");
  return { success: true };
}
