import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

// Database-backed rate limiting, shared by every server instance (an
// in-memory counter resets per instance on serverless hosting). Each
// counted attempt is a RateLimitHit row; a key is over its limit when it
// has `limit` rows inside the window.

export type Limit = { limit: number; windowMs: number };

const MINUTE = 60 * 1000;

export const LIMITS = {
  // Failed sign-ins: per account, and per network address across accounts.
  loginEmail: { limit: 10, windowMs: 15 * MINUTE },
  loginIp: { limit: 50, windowMs: 15 * MINUTE },
  // Emailed sign-in links, per address.
  magicLinkEmail: { limit: 5, windowMs: 60 * MINUTE },
  contactForm: { limit: 5, windowMs: 60 * MINUTE },
  supportTicket: { limit: 10, windowMs: 60 * MINUTE },
  assistant: { limit: 15, windowMs: 10 * MINUTE },
  reasoning: { limit: 30, windowMs: 60 * MINUTE },
  message: { limit: 120, windowMs: 10 * MINUTE },
  // Praxxt Anatomy: new trial accounts per network address, and checkouts per user.
  anatomySignup: { limit: 5, windowMs: 60 * MINUTE },
  anatomyCheckout: { limit: 10, windowMs: 60 * MINUTE },
} satisfies Record<string, Limit>;

export async function isOverLimit(key: string, { limit, windowMs }: Limit): Promise<boolean> {
  const count = await prisma.rateLimitHit.count({
    where: { key, createdAt: { gte: new Date(Date.now() - windowMs) } },
  });
  return count >= limit;
}

export async function recordHit(key: string): Promise<void> {
  await prisma.rateLimitHit.create({ data: { key } });
  // Occasional cleanup instead of a scheduled job.
  if (Math.random() < 0.02) {
    await prisma.rateLimitHit.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 24 * 60 * MINUTE) } } });
  }
}

// Counts an attempt and says whether it may go ahead: false once the key
// has used up its limit (the refused attempt isn't counted).
export async function consume(key: string, limit: Limit): Promise<boolean> {
  if (await isOverLimit(key, limit)) return false;
  await recordHit(key);
  return true;
}

// The visitor's address as Vercel reports it (first x-forwarded-for hop).
export function ipFrom(headerValue: string | null | undefined): string {
  return headerValue?.split(",")[0]?.trim() || "unknown";
}

export async function requestIp(): Promise<string> {
  return ipFrom((await headers()).get("x-forwarded-for"));
}
