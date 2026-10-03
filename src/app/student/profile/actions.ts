"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/require-role";
import { getStudentProfileByUserId } from "@/lib/student";
import { prisma } from "@/lib/prisma";

export type ActionResult = { error?: string; ok?: true };

const MAX_STATEMENT_LENGTH = 2000;

// Online-only, like every other coordinator/profile-style write in this
// app (see the PendingOpType comment in src/lib/offline/db.ts) — a
// student edits their own profile from home, not mid-shift at a site with
// no signal, so this doesn't need the offline queue.
export async function updateStudentProfile(
  _prevState: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const session = await requireRole("STUDENT");
  const studentProfile = await getStudentProfileByUserId(session.user.id);

  const phone = formData.get("phone")?.toString().trim() ?? "";
  const areasOfInterest = formData.get("areasOfInterest")?.toString().trim() ?? "";
  const personalStatement = formData.get("personalStatement")?.toString().trim() ?? "";

  if (personalStatement.length > MAX_STATEMENT_LENGTH) {
    return { error: `Personal statement is limited to ${MAX_STATEMENT_LENGTH} characters.` };
  }

  await prisma.studentProfile.update({
    where: { id: studentProfile.id },
    data: {
      phone: phone || null,
      areasOfInterest: areasOfInterest || null,
      personalStatement: personalStatement || null,
    },
  });

  revalidatePath("/student");
  revalidatePath("/student/profile");
  return { ok: true };
}
