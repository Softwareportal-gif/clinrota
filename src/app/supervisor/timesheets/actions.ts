"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";
import { getSupervisorProfileByUserId } from "@/lib/supervisor";

export type DecideTimesheetState = { error?: string } | undefined;

export async function decideTimesheet(
  timesheetId: string,
  _prevState: DecideTimesheetState,
  formData: FormData
): Promise<DecideTimesheetState> {
  const session = await requireRole("SUPERVISOR");
  const supervisorProfile = await getSupervisorProfileByUserId(session.user.id);

  const entry = await prisma.timesheetEntry.findUnique({
    where: { id: timesheetId },
    include: { rotation: true },
  });
  if (!entry || entry.rotation.supervisorId !== supervisorProfile.id || entry.status !== "PENDING") {
    return { error: "This timesheet is no longer awaiting your approval." };
  }

  const intent = formData.get("intent");
  const status = intent === "approve" ? "APPROVED" : intent === "reject" ? "REJECTED" : null;
  if (!status) return { error: "Unknown action." };

  await prisma.timesheetEntry.update({
    where: { id: timesheetId },
    data: { status, approvedById: session.user.id, approvedAt: new Date() },
  });

  revalidatePath("/supervisor/timesheets");
}
