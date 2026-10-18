// Who may use Praxxt Anatomy, and how much of it. A 2-week trial starts on
// sign-up; Student and Professional plans are bought online for a year;
// Institution plans are arranged with sales. While feedback is being
// collected the trial shows the whole body; with ANATOMY_TRIAL_LIMIT set to
// "skeletal" it shows only the skeletal system.
import type { AnatomySystem } from "./catalogue";

export type PlanId = "TRIAL" | "STUDENT" | "PROFESSIONAL" | "INSTITUTION";
export type AccessLevel = "full" | "skeletal" | "none";
export type TrialLimit = "skeletal" | "none";

export const TRIAL_DAYS = 14;
const DAY_MS = 86_400_000;

// Prices in pesewas (GH₵1 = 100 pesewas), per year.
export const PLANS: Record<Exclude<PlanId, "TRIAL">, { name: string; amount: number | null; audience: string }> = {
  STUDENT: { name: "Student", amount: 15000, audience: "For students of nursing, midwifery, medicine and the allied health professions." },
  PROFESSIONAL: { name: "Professional", amount: 45000, audience: "For clinicians, lecturers and preceptors who teach with it." },
  INSTITUTION: { name: "Institution", amount: null, audience: "For schools and hospitals: seats for whole cohorts, set up with our team." },
};

export const formatCedis = (pesewas: number) =>
  `GH₵${(pesewas / 100).toLocaleString("en-GH", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export function trialLimit(): TrialLimit {
  return process.env.ANATOMY_TRIAL_LIMIT === "skeletal" ? "skeletal" : "none";
}

export const trialEnd = (from: Date) => new Date(from.getTime() + TRIAL_DAYS * DAY_MS);

export type Access = { level: AccessLevel; plan: PlanId | null; endsAt: Date | null; daysLeft: number | null };

export function anatomyAccess(input: {
  role: string;
  subscription: { plan: PlanId; endsAt: Date } | null;
  now: Date;
  trialLimit: TrialLimit;
}): Access {
  const { role, subscription, now } = input;
  if (role === "SUPER_ADMIN") return { level: "full", plan: subscription?.plan ?? null, endsAt: subscription?.endsAt ?? null, daysLeft: null };
  if (!subscription) return { level: "none", plan: null, endsAt: null, daysLeft: null };

  const msLeft = subscription.endsAt.getTime() - now.getTime();
  const daysLeft = Math.max(0, Math.ceil(msLeft / DAY_MS));
  if (msLeft <= 0) return { level: "none", plan: subscription.plan, endsAt: subscription.endsAt, daysLeft: 0 };
  const level: AccessLevel = subscription.plan === "TRIAL" && input.trialLimit === "skeletal" ? "skeletal" : "full";
  return { level, plan: subscription.plan, endsAt: subscription.endsAt, daysLeft };
}

// The systems a level may see; null means all of them.
export function allowedSystems(level: AccessLevel): AnatomySystem[] | null {
  if (level === "full") return null;
  if (level === "skeletal") return ["skeletal"];
  return [];
}

// Whether a model-route key (see model-storage.ts) may be served at this
// level. The overview holds muscles too, so skeleton-only access skips it.
export function canLoadModelKey(level: AccessLevel, key: string, systemOf: (id: string) => string | undefined): boolean {
  if (level === "full") return true;
  if (level === "none") return false;
  const [, kind, ...rest] = key.split("/");
  if (kind === "catalogue.json") return true;
  if (kind === "chunks") return rest[0] === "skeletal";
  if (kind === "content") return systemOf(rest[0].replace(/\.json$/, "")) === "skeletal";
  return false;
}

// When a newly paid plan ends: a year from now, or a year after an active paid
// plan's current end (renewing early never loses days). A trial is replaced.
export function nextPaidEnd(current: { plan: PlanId; endsAt: Date } | null, now: Date): Date {
  const from = current && current.plan !== "TRIAL" && current.endsAt > now ? current.endsAt : now;
  const end = new Date(from);
  end.setUTCFullYear(end.getUTCFullYear() + 1);
  return end;
}
