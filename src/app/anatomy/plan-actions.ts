"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { auth, signIn } from "@/auth";
import { isPaystackConfigured } from "@/lib/anatomy/paystack";
import { isBuyablePlan, startCheckout, startTrial } from "@/lib/anatomy/subscriptions";
import { trialEnd } from "@/lib/anatomy/access";
import { appBaseUrl } from "@/lib/app-url";
import { prisma } from "@/lib/prisma";
import { consume, LIMITS, requestIp } from "@/lib/rate-limit";

const LEARNER_INSTITUTION = "anatomy-learners";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type SignUpState = { error?: string; values?: { name: string; email: string } } | undefined;

// Public sign-up: a learner account with a 2-week trial, then straight in.
export async function signUpForTrial(_prev: SignUpState, formData: FormData): Promise<SignUpState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const values = { name, email };

  if (name.length < 2 || name.length > 100) return { error: "Enter your full name.", values };
  if (!EMAIL.test(email) || email.length > 200) return { error: "Enter a valid email address.", values };
  if (password.length < 8 || password.length > 200) return { error: "Choose a password of at least 8 characters.", values };
  if (formData.get("terms") !== "on") return { error: "Please accept the terms to continue.", values };

  if (!(await consume(`anatomy:signup:${await requestIp()}`, LIMITS.anatomySignup))) {
    return { error: "Too many sign-ups from this network. Please try again in an hour.", values };
  }
  if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) {
    return { error: "There's already an account with this email. Log in instead, then start your trial.", values };
  }

  const now = new Date();
  await prisma.user.create({
    data: {
      name,
      email,
      role: "LEARNER",
      institutionId: LEARNER_INSTITUTION,
      passwordHash: await bcrypt.hash(password, 10),
      anatomySubscription: { create: { plan: "TRIAL", startsAt: now, endsAt: trialEnd(now) } },
    },
  });

  try {
    await signIn("credentials", { email, password, redirectTo: "/anatomy" });
  } catch (error) {
    if (error instanceof AuthError) redirect("/login?callbackUrl=/anatomy");
    throw error;
  }
}

// For someone already signed in (any Praxxt account) who has never had a plan.
export async function startMyTrial(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/anatomy");
  await startTrial(session.user.id);
  redirect("/anatomy");
}

// "Buy" on the plans page: sign up first if needed, then Paystack checkout.
export async function buyPlan(formData: FormData): Promise<void> {
  const plan = formData.get("plan");
  if (!isBuyablePlan(plan) || !isPaystackConfigured()) redirect("/anatomy/plans");

  const session = await auth();
  if (!session?.user?.id) redirect(`/anatomy/start?plan=${plan}`);
  if (!(await consume(`anatomy:checkout:${session.user.id}`, LIMITS.anatomyCheckout))) redirect("/anatomy/plans?error=busy");

  let url: string;
  try {
    url = await startCheckout({
      userId: session.user.id,
      email: session.user.email!,
      plan,
      callbackUrl: `${appBaseUrl()}/anatomy/plans/confirm`,
    });
  } catch {
    redirect("/anatomy/plans?error=checkout");
  }
  redirect(url);
}
