"use server";

import { escapeHtml, sendEmail } from "@/lib/email";
import { consume, LIMITS, requestIp } from "@/lib/rate-limit";

// Praxxt Anatomy is "coming soon": instead of signing up, visitors leave their
// email and we tell them at launch. Each request is emailed to the team (no
// database table, so nothing to migrate). Public and unauthenticated, like the
// contact form, so it is capped per network address.
const WAITLIST_INBOX = "hello@praxxt.com";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLES = ["Student", "Health professional", "Educator", "Other"];

export type WaitlistState = { ok: true } | { ok: false; error: string } | undefined;

export async function joinAnatomyWaitlist(_prev: WaitlistState, formData: FormData): Promise<WaitlistState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "").trim();

  if (!EMAIL_RE.test(email) || email.length > 200) {
    return { ok: false, error: "Please enter a valid email address." };
  }
  const safeRole = ROLES.includes(role) ? role : "Not given";

  if (!(await consume(`anatomy-waitlist:ip:${await requestIp()}`, LIMITS.contactForm))) {
    return { ok: false, error: "Too many requests from your network. Please try again later." };
  }

  const result = await sendEmail({
    to: WAITLIST_INBOX,
    subject: `Praxxt Anatomy waitlist: ${email}`.replace(/[\r\n]+/g, " "),
    html: `
      <div style="font-family: sans-serif;">
        <p>Someone joined the Praxxt Anatomy waitlist.</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>I am a:</strong> ${escapeHtml(safeRole)}</p>
      </div>
    `,
  });

  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true };
}
