"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/require-role";
import { prisma } from "@/lib/prisma";
import type { PlanId } from "@/lib/anatomy/access";

const PLAN_IDS: PlanId[] = ["TRIAL", "STUDENT", "PROFESSIONAL", "INSTITUTION"];

export type SetPlanState = { error?: string; done?: string } | undefined;

// Gives (or changes) a user's Praxxt Anatomy plan by hand: Institution deals,
// extending a tester, or fixing a payment that went astray. Runs from now.
export async function setAnatomyPlan(_prev: SetPlanState, formData: FormData): Promise<SetPlanState> {
  await requireRole("SUPER_ADMIN");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const plan = String(formData.get("plan") ?? "") as PlanId;
  const months = Number(formData.get("months"));
  if (!email) return { error: "Enter the user's email." };
  if (!PLAN_IDS.includes(plan)) return { error: "Choose a plan." };
  if (!Number.isInteger(months) || months < 0 || months > 36) return { error: "Months must be a whole number from 0 to 36." };

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true } });
  if (!user) return { error: `No account with the email ${email}.` };

  const now = new Date();
  const endsAt = new Date(now);
  endsAt.setUTCMonth(endsAt.getUTCMonth() + months);
  await prisma.anatomySubscription.upsert({
    where: { userId: user.id },
    create: { userId: user.id, plan, startsAt: now, endsAt },
    update: { plan, startsAt: now, endsAt },
  });
  revalidatePath("/admin/anatomy");
  return {
    done:
      months === 0
        ? `Ended ${user.name}'s access.`
        : `${user.name} now has ${plan.toLowerCase()} until ${endsAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}.`,
  };
}

export type TesterState = { error?: string; done?: string } | undefined;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// One shared login for testers, made here so public sign-up can stay frozen
// (ANATOMY_SIGNUP="closed"). A learner account with full access for the
// chosen months; the admin picks the email and password and shares them.
export async function createTesterAccount(_prev: TesterState, formData: FormData): Promise<TesterState> {
  await requireRole("SUPER_ADMIN");
  const name = String(formData.get("name") ?? "").trim() || "Praxxt Anatomy tester";
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const months = Number(formData.get("months"));
  if (!EMAIL.test(email) || email.length > 200) return { error: "Enter a valid email for the tester login." };
  if (password.length < 10 || password.length > 200) return { error: "Choose a password of at least 10 characters." };
  if (!Number.isInteger(months) || months < 1 || months > 12) return { error: "Months must be a whole number from 1 to 12." };
  if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) {
    return { error: `There's already an account with ${email}. Use another email, or set its plan above.` };
  }

  const now = new Date();
  const endsAt = new Date(now);
  endsAt.setUTCMonth(endsAt.getUTCMonth() + months);
  await prisma.user.create({
    data: {
      name,
      email,
      role: "LEARNER",
      institutionId: "anatomy-learners",
      passwordHash: await bcrypt.hash(password, 10),
      anatomySubscription: { create: { plan: "INSTITUTION", startsAt: now, endsAt } },
    },
  });
  revalidatePath("/admin/anatomy");
  return { done: `Tester login ${email} is ready, with full access until ${endsAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}.` };
}
