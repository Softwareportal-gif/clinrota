"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";
import { getCoordinatorProfileByUserId } from "@/lib/coordinator";
import { sendEmail, studentInviteEmailHtml } from "@/lib/email";
import { appBaseUrl } from "@/lib/app-url";

export type SendInvitationsResult = {
  sent: string[];
  failed: { id: string; name: string; error: string }[];
};

// Independent per recipient, not a single transaction — an email failing
// for one student must not affect the others, and each one's status flip
// only happens after ITS OWN email genuinely sent (see the spec: a failed
// send leaves that student as IMPORTED, surfaced, not silently dropped).
// Sequential rather than Promise.all for the same reason as elsewhere in
// this codebase — avoid hammering the DB/email provider concurrently.
export async function sendInvitations(userIds: string[]): Promise<SendInvitationsResult> {
  const session = await requireRole("COORDINATOR");
  const coordinatorProfile = await getCoordinatorProfileByUserId(session.user.id);

  // Scoped to this coordinator's own program and role=STUDENT regardless
  // of what ids the client submits — mirrors the CoordinatorProfile
  // single-program boundary enforced elsewhere in the app.
  const users = await prisma.user.findMany({
    where: {
      id: { in: userIds },
      role: "STUDENT",
      studentProfile: { programId: coordinatorProfile.programId },
    },
  });

  const loginUrl = `${appBaseUrl()}/login`;
  const sent: string[] = [];
  const failed: { id: string; name: string; error: string }[] = [];

  for (const user of users) {
    const result = await sendEmail({
      to: user.email,
      subject: "You've been added to ClinRota",
      html: studentInviteEmailHtml({
        studentName: user.name,
        programName: coordinatorProfile.program.name,
        loginUrl,
      }),
    });

    if (result.ok) {
      await prisma.user.update({ where: { id: user.id }, data: { status: "INVITED" } });
      sent.push(user.id);
    } else {
      failed.push({ id: user.id, name: user.name, error: result.error });
    }
  }

  revalidatePath("/coordinator/students");
  return { sent, failed };
}

export type UpdateStudentIdResult = { ok: true } | { ok: false; error: string };

// studentIdNumber is globally unique at the DB level (not just per
// program — see StudentProfile.studentIdNumber's @unique in schema.prisma),
// so the collision check has to be global too, even though in practice a
// coordinator only cares about clashing with someone in their own program.
export async function updateStudentIdNumber(
  studentProfileId: string,
  newIdNumber: string
): Promise<UpdateStudentIdResult> {
  const session = await requireRole("COORDINATOR");
  const coordinatorProfile = await getCoordinatorProfileByUserId(session.user.id);

  const trimmed = newIdNumber.trim();
  if (!trimmed) {
    return { ok: false, error: "Student ID can't be blank." };
  }

  const profile = await prisma.studentProfile.findUnique({ where: { id: studentProfileId } });
  if (!profile || profile.programId !== coordinatorProfile.programId) {
    return { ok: false, error: "Student not found." };
  }

  const collision = await prisma.studentProfile.findFirst({
    where: { studentIdNumber: trimmed, id: { not: studentProfileId } },
  });
  if (collision) {
    return { ok: false, error: `Student ID "${trimmed}" is already in use by another student.` };
  }

  await prisma.studentProfile.update({
    where: { id: studentProfileId },
    data: { studentIdNumber: trimmed },
  });

  revalidatePath("/coordinator/students");
  return { ok: true };
}
