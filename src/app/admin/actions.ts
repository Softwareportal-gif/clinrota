"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";
import { getInstitutionIdForUser } from "@/lib/admin";
import { coordinatorInviteEmailHtml, sendEmail } from "@/lib/email";
import { appBaseUrl } from "@/lib/app-url";

export type AddCoordinatorState =
  | { ok: true; message: string }
  | { ok: false; error: string }
  | undefined;

const MIN_PASSWORD_LENGTH = 8;

// A program can't be run until someone coordinates it — coordinators are
// the ones who add its students and supervisors — so this is the step that
// makes a newly created program usable. Mirrors inviteWardSupervisor
// (coordinator/sites/ward-supervision-actions.ts): create the account, then
// email a pointer to the magic-link login. The optional temporary password
// covers deployments where email isn't configured yet, where the magic
// link can't reach anyone either.
export async function addCoordinator(
  programId: string,
  _prevState: AddCoordinatorState,
  formData: FormData
): Promise<AddCoordinatorState> {
  const session = await requireRole("SUPER_ADMIN");
  const institutionId = await getInstitutionIdForUser(session.user.id);

  const program = await prisma.program.findFirst({ where: { id: programId, institutionId } });
  if (!program) return { ok: false, error: "That program no longer exists." };

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!name) return { ok: false, error: "Enter the coordinator's name." };
  if (!email || !email.includes("@")) return { ok: false, error: "Enter a valid email." };
  if (password && password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: `The temporary password needs at least ${MIN_PASSWORD_LENGTH} characters.` };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { ok: false, error: "That email is already in use by another account." };

  const user = await prisma.user.create({
    data: {
      institutionId,
      role: "COORDINATOR",
      name,
      email,
      status: "IMPORTED",
      passwordHash: password ? await bcrypt.hash(password, 10) : null,
      coordinatorProfile: { create: { programId: program.id } },
    },
  });

  const result = await sendEmail({
    to: user.email,
    subject: "You've been added to Praxxt",
    html: coordinatorInviteEmailHtml({
      coordinatorName: user.name,
      programName: program.name,
      loginUrl: `${appBaseUrl()}/login`,
    }),
  });
  if (result.ok) {
    await prisma.user.update({ where: { id: user.id }, data: { status: "INVITED" } });
  }

  revalidatePath("/admin");

  if (result.ok) {
    return { ok: true, message: `${name} has been added and emailed an invitation.` };
  }
  return {
    ok: true,
    message: password
      ? `${name} has been added. The invitation email couldn't be sent, so share the login page and their temporary password with them yourself.`
      : `${name} has been added, but the invitation email couldn't be sent and they have no password yet, so they can't sign in until email is working.`,
  };
}
