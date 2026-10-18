// Praxxt Anatomy subscriptions in the database: who has which plan until
// when, starting trials, and turning a Paystack payment into a plan.
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { anatomyAccess, nextPaidEnd, PLANS, trialEnd, trialLimit, type Access, type PlanId } from "./access";
import { initializeCheckout, verifyTransaction } from "./paystack";

export async function accessForUser(userId: string, role: string, now = new Date()): Promise<Access> {
  const subscription = await prisma.anatomySubscription.findUnique({ where: { userId } });
  return anatomyAccess({ role, subscription, now, trialLimit: trialLimit() });
}

// A trial, once per user: anyone who has ever had a subscription can't start
// another (they buy a plan instead).
export async function startTrial(userId: string, now = new Date()): Promise<boolean> {
  const existing = await prisma.anatomySubscription.findUnique({ where: { userId } });
  if (existing) return false;
  await prisma.anatomySubscription.create({ data: { userId, plan: "TRIAL", startsAt: now, endsAt: trialEnd(now) } });
  return true;
}

export type BuyablePlan = "STUDENT" | "PROFESSIONAL";

export function isBuyablePlan(plan: unknown): plan is BuyablePlan {
  return plan === "STUDENT" || plan === "PROFESSIONAL";
}

// Records the pending payment, then returns Paystack's payment page.
export async function startCheckout(input: { userId: string; email: string; plan: BuyablePlan; callbackUrl: string }): Promise<string> {
  const amount = PLANS[input.plan].amount!;
  const reference = `praxxt-anatomy-${randomUUID()}`;
  await prisma.anatomyPayment.create({ data: { userId: input.userId, plan: input.plan, reference, amount } });
  return initializeCheckout({
    email: input.email,
    amount,
    reference,
    callbackUrl: input.callbackUrl,
    metadata: { plan: input.plan, userId: input.userId },
  });
}

export type ConfirmResult = { ok: true; plan: PlanId; endsAt: Date } | { ok: false; reason: "unknown" | "unpaid" | "mismatch" };

// Checks the payment with Paystack and, the first time it succeeds, gives
// the plan. Safe to call again for the same reference (redirect + webhook).
export async function confirmPayment(reference: string, now = new Date()): Promise<ConfirmResult> {
  const payment = await prisma.anatomyPayment.findUnique({ where: { reference } });
  if (!payment) return { ok: false, reason: "unknown" };
  if (payment.status === "success") {
    const sub = await prisma.anatomySubscription.findUnique({ where: { userId: payment.userId } });
    return sub ? { ok: true, plan: sub.plan, endsAt: sub.endsAt } : { ok: false, reason: "unknown" };
  }

  const tx = await verifyTransaction(reference);
  if (tx.status !== "success") {
    if (tx.status === "failed" || tx.status === "abandoned") {
      await prisma.anatomyPayment.update({ where: { reference }, data: { status: "failed" } });
    }
    return { ok: false, reason: "unpaid" };
  }
  if (tx.amount !== payment.amount || tx.currency !== payment.currency) return { ok: false, reason: "mismatch" };

  return prisma.$transaction(async (db) => {
    // Only the first confirmation flips pending → success and grants the plan.
    const claimed = await db.anatomyPayment.updateMany({
      where: { reference, status: { not: "success" } },
      data: { status: "success", paidAt: now },
    });
    const current = await db.anatomySubscription.findUnique({ where: { userId: payment.userId } });
    if (claimed.count === 0) {
      return current ? { ok: true as const, plan: current.plan, endsAt: current.endsAt } : { ok: false as const, reason: "unknown" as const };
    }
    const endsAt = nextPaidEnd(current, now);
    const sub = await db.anatomySubscription.upsert({
      where: { userId: payment.userId },
      create: { userId: payment.userId, plan: payment.plan, startsAt: now, endsAt },
      update: { plan: payment.plan, startsAt: now, endsAt },
    });
    return { ok: true as const, plan: sub.plan, endsAt: sub.endsAt };
  });
}
