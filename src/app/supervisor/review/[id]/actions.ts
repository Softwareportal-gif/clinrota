"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";
import { getSupervisorProfileByUserId } from "@/lib/supervisor";
import type { ReviewDecision, LogEntryStatus } from "@/generated/prisma/client";
import { ENTRUSTMENT_LEVEL_ORDER } from "@/lib/entrustment";
import { canReviewLogEntry } from "@/lib/log-entry-review";
import { logAudit } from "@/lib/audit-log";
import type { SubmitReviewPayload } from "@/lib/offline/payloads";

export type CoreResult = { error?: string; ok?: true };

// Upsert-safe by design: replaying the exact same queued decision (same
// client-generated review id) after it already landed is a no-op, not an
// error — important since the entry is no longer SUBMITTED once decided,
// which would otherwise look like a conflict on a second sync attempt.
export async function submitReviewCore(payload: SubmitReviewPayload): Promise<CoreResult> {
  const session = await requireRole("SUPERVISOR");
  const supervisorProfile = await getSupervisorProfileByUserId(session.user.id);

  const entry = await prisma.logEntry.findUnique({
    where: { id: payload.logEntryId },
    include: { rotation: true, student: { include: { user: true } }, review: true, wardAssignment: true },
  });
  if (!entry || !canReviewLogEntry(entry, supervisorProfile.id)) {
    return { error: "This entry is no longer awaiting your review." };
  }

  if (entry.review?.id === payload.id) {
    return { ok: true };
  }

  if (entry.status !== "SUBMITTED") {
    return { error: "This entry is no longer awaiting your review." };
  }

  if (!ENTRUSTMENT_LEVEL_ORDER.includes(payload.supervisorAssessedRole)) {
    return { error: "Select your assessed supervision level." };
  }

  const comments = payload.comments.trim();

  let decision: ReviewDecision;
  let newStatus: LogEntryStatus;
  let notificationType: string;
  let notificationTitle: string;

  if (payload.intent === "approve") {
    if (!payload.attested) return { error: "Check the attestation box to approve." };
    decision = "APPROVED";
    newStatus = "APPROVED";
    notificationType = "ENTRY_APPROVED";
    notificationTitle = "Your entry was approved";
  } else if (payload.intent === "reject") {
    if (!comments) return { error: "Add a comment explaining the rejection." };
    decision = "REJECTED";
    newStatus = "REJECTED";
    notificationType = "ENTRY_REJECTED";
    notificationTitle = "Your entry was rejected";
  } else if (payload.intent === "revise") {
    if (!comments) return { error: "Add a comment explaining what needs revision." };
    decision = "NEEDS_REVISION";
    newStatus = "NEEDS_REVISION";
    notificationType = "ENTRY_NEEDS_REVISION";
    notificationTitle = "Your entry needs revision";
  } else {
    return { error: "Unknown action." };
  }

  await prisma.$transaction([
    prisma.logEntry.update({
      where: { id: payload.logEntryId },
      data: { status: newStatus, supervisorAssessedRole: payload.supervisorAssessedRole },
    }),
    prisma.supervisorReview.upsert({
      where: { logEntryId: payload.logEntryId },
      create: {
        id: payload.id,
        logEntryId: payload.logEntryId,
        supervisorId: session.user.id,
        decision,
        comments: comments || null,
        attested: payload.attested,
      },
      update: {
        decision,
        comments: comments || null,
        attested: payload.attested,
        reviewedAt: new Date(),
      },
    }),
    prisma.notification.create({
      data: {
        userId: entry.student.user.id,
        type: notificationType,
        title: notificationTitle,
        body: `${session.user.name} reviewed your case: ${entry.caseTitle}.`,
        relatedEntityType: "LogEntry",
        relatedEntityId: payload.logEntryId,
      },
    }),
  ]);

  // A parallel, explicit trail for ward-level decisions specifically — the
  // main-supervisor review flow above doesn't audit-log at all today, but
  // Phase 5 asked for accountability on ward-level actions in particular.
  if (entry.wardAssignment) {
    await logAudit({
      actorId: session.user.id,
      action: "WARD_REVIEW_SUBMITTED",
      entityType: "SupervisorReview",
      entityId: payload.id,
      afterData: { decision, wardAssignmentId: entry.wardAssignment.id, logEntryId: payload.logEntryId },
    });
  }

  return { ok: true };
}
