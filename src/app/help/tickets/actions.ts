"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail, supportTicketEmailHtml } from "@/lib/email";
import { consume, LIMITS } from "@/lib/rate-limit";

export type CreateTicketState = { error?: string; ok?: true } | undefined;

const ADMIN_EMAIL = "hello@praxxt.com";

// Open to every signed-in role (student, supervisor, coordinator, super
// admin) — support requests aren't scoped to one section of the app.
export async function createTicket(
  _prevState: CreateTicketState,
  formData: FormData
): Promise<CreateTicketState> {
  const session = await auth();
  if (!session?.user) return { error: "You need to sign in to create a ticket." };

  const subject = (formData.get("subject")?.toString() ?? "").replace(/[\r\n]+/g, " ").trim();
  const description = formData.get("description")?.toString().trim() ?? "";
  if (!subject) return { error: "Enter a subject." };
  if (!description) return { error: "Describe what's going on." };
  if (subject.length > 150) return { error: "Keep the subject under 150 characters." };
  if (description.length > 5000) return { error: "Keep the description under 5,000 characters." };
  if (!(await consume(`ticket:user:${session.user.id}`, LIMITS.supportTicket))) {
    return { error: "You've created a lot of tickets recently. Please try again in an hour." };
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });

  await prisma.supportTicket.create({
    data: { subject, description, createdById: user.id },
  });

  // Best-effort — the ticket row is already saved either way, so a flaky
  // email send shouldn't make it look like the submission failed.
  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `New support ticket: ${subject}`,
    html: supportTicketEmailHtml({
      subject,
      description,
      submitterName: user.name,
      submitterEmail: user.email,
      submitterRole: user.role,
    }),
  });

  revalidatePath("/help/tickets");
  return { ok: true };
}
