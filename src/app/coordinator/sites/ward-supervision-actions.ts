"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";
import { getCoordinatorProfileByUserId } from "@/lib/coordinator";
import { sendEmail, supervisorInviteEmailHtml } from "@/lib/email";
import { appBaseUrl } from "@/lib/app-url";

async function requireSiteInCoordinatorInstitution(siteId: string) {
  const session = await requireRole("COORDINATOR");
  const coordinatorProfile = await getCoordinatorProfileByUserId(session.user.id);

  const site = await prisma.clinicalSite.findUnique({ where: { id: siteId } });
  if (!site || site.institutionId !== coordinatorProfile.program.institutionId) {
    throw new Error("Site not found.");
  }
  return { session, coordinatorProfile, site };
}

export async function setWardSupervisionEnabled(siteId: string, enabled: boolean): Promise<void> {
  await requireSiteInCoordinatorInstitution(siteId);
  await prisma.clinicalSite.update({ where: { id: siteId }, data: { wardSupervisionEnabled: enabled } });
  revalidatePath(`/coordinator/sites/${siteId}`);
}

export type AddEligibleSupervisorResult = { ok: true } | { ok: false; error: string };

// Adds an EXISTING SupervisorProfile in this institution to the site's ward
// roster. Server-side re-checks role/institution regardless of what the
// client's dropdown showed, same defensive posture as sendInvitations.
export async function addWardSupervisorEligibility(
  siteId: string,
  supervisorProfileId: string
): Promise<AddEligibleSupervisorResult> {
  const { coordinatorProfile } = await requireSiteInCoordinatorInstitution(siteId);

  const supervisorProfile = await prisma.supervisorProfile.findFirst({
    where: { id: supervisorProfileId, user: { institutionId: coordinatorProfile.program.institutionId, role: "SUPERVISOR" } },
  });
  if (!supervisorProfile) return { ok: false, error: "Supervisor not found." };

  await prisma.wardSupervisorEligibility.upsert({
    where: { clinicalSiteId_supervisorProfileId: { clinicalSiteId: siteId, supervisorProfileId } },
    create: { clinicalSiteId: siteId, supervisorProfileId },
    update: {},
  });

  revalidatePath(`/coordinator/sites/${siteId}`);
  return { ok: true };
}

// Stopping future eligibility only — does not touch any WardAssignment or
// SupervisorReview already made under this supervisor, per spec: removal
// must not retroactively break past assignments/reviews.
export async function removeWardSupervisorEligibility(siteId: string, eligibilityId: string): Promise<void> {
  await requireSiteInCoordinatorInstitution(siteId);
  await prisma.wardSupervisorEligibility.deleteMany({
    where: { id: eligibilityId, clinicalSiteId: siteId },
  });
  revalidatePath(`/coordinator/sites/${siteId}`);
}

export type InviteWardSupervisorResult = { ok: true } | { ok: false; error: string };

// No supervisor-invite flow existed anywhere in the app before this — the
// only prior invite action (sendInvitations, coordinator/students/actions.ts)
// is hardcoded to role STUDENT. This mirrors its shape (create the account,
// email a magic-link pointer, leave status IMPORTED until the email sends)
// for role SUPERVISOR instead, then immediately grants ward eligibility at
// this site so a brand-new hire doesn't need a second step.
export async function inviteWardSupervisor(
  siteId: string,
  name: string,
  email: string
): Promise<InviteWardSupervisorResult> {
  const { coordinatorProfile, site } = await requireSiteInCoordinatorInstitution(siteId);

  const trimmedName = name.trim();
  const trimmedEmail = email.trim().toLowerCase();
  if (!trimmedName) return { ok: false, error: "Enter a name." };
  if (!trimmedEmail || !trimmedEmail.includes("@")) return { ok: false, error: "Enter a valid email." };

  const existing = await prisma.user.findUnique({ where: { email: trimmedEmail } });
  if (existing) {
    return {
      ok: false,
      error:
        existing.role === "SUPERVISOR"
          ? "That email already belongs to a supervisor — add them from the list above instead."
          : "That email is already in use by another account.",
    };
  }

  const user = await prisma.user.create({
    data: {
      institutionId: coordinatorProfile.program.institutionId,
      role: "SUPERVISOR",
      name: trimmedName,
      email: trimmedEmail,
      status: "IMPORTED",
      supervisorProfile: { create: {} },
    },
    include: { supervisorProfile: true },
  });

  await prisma.wardSupervisorEligibility.create({
    data: { clinicalSiteId: siteId, supervisorProfileId: user.supervisorProfile!.id },
  });

  const loginUrl = `${appBaseUrl()}/login`;
  const result = await sendEmail({
    to: user.email,
    subject: "You've been added to Praxxt",
    html: supervisorInviteEmailHtml({
      supervisorName: user.name,
      institutionName: site.name,
      loginUrl,
    }),
  });

  if (result.ok) {
    await prisma.user.update({ where: { id: user.id }, data: { status: "INVITED" } });
  }

  revalidatePath(`/coordinator/sites/${siteId}`);
  // The account + eligibility row exist either way — a failed send just
  // means the coordinator needs to resend rather than losing the work,
  // same tradeoff sendInvitations makes for students.
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true };
}
