"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";
import { getCoordinatorProfileByUserId } from "@/lib/coordinator";

export type ReviewDocState = { error?: string } | undefined;

export async function decideDocument(
  documentId: string,
  _prevState: ReviewDocState,
  formData: FormData
): Promise<ReviewDocState> {
  const session = await requireRole("COORDINATOR");
  const coordinatorProfile = await getCoordinatorProfileByUserId(session.user.id);

  const doc = await prisma.complianceDocument.findUnique({
    where: { id: documentId },
    include: { student: { include: { user: true } } },
  });
  if (
    !doc ||
    doc.student.programId !== coordinatorProfile.programId ||
    doc.verificationStatus !== "PENDING_VERIFICATION"
  ) {
    return { error: "This document is no longer awaiting review." };
  }

  const intent = formData.get("intent");
  const reason = String(formData.get("reason") ?? "").trim();

  if (intent === "verify") {
    await prisma.complianceDocument.update({
      where: { id: documentId },
      data: {
        verificationStatus: "VERIFIED",
        rejectionReason: null,
        verifiedById: session.user.id,
        verifiedAt: new Date(),
      },
    });
    await prisma.notification.create({
      data: {
        userId: doc.student.user.id,
        type: "DOCUMENT_VERIFIED",
        title: "Document verified",
        body: `Your document was verified by ${session.user.name}.`,
        relatedEntityType: "ComplianceDocument",
        relatedEntityId: documentId,
      },
    });
  } else if (intent === "reject") {
    if (!reason) return { error: "Add a reason for rejecting this document." };
    await prisma.complianceDocument.update({
      where: { id: documentId },
      data: {
        verificationStatus: "REJECTED",
        rejectionReason: reason,
        verifiedById: session.user.id,
        verifiedAt: new Date(),
      },
    });
    await prisma.notification.create({
      data: {
        userId: doc.student.user.id,
        type: "DOCUMENT_REJECTED",
        title: "Document rejected",
        body: `${session.user.name} rejected your document: ${reason}`,
        relatedEntityType: "ComplianceDocument",
        relatedEntityId: documentId,
      },
    });
  } else {
    return { error: "Unknown action." };
  }

  redirect("/coordinator/compliance/queue");
}
