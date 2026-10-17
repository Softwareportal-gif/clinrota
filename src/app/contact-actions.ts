"use server";

import { escapeHtml, sendEmail } from "@/lib/email";
import { consume, LIMITS, requestIp } from "@/lib/rate-limit";

// Placeholder — the user has said they'll swap this for a real address.
// Deliberately not gated behind auth: this is the one public, unauthenticated
// server action in the app, reachable from the marketing page anyone can visit.
const CONTACT_EMAIL = "hello@praxxt.com";

export type ContactFormState = { ok: true } | { ok: false; error: string } | undefined;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function submitContactRequest(
  _prevState: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const institution = String(formData.get("institution") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!name || !email || !message) {
    return { ok: false, error: "Please fill in your name, email, and a short message." };
  }
  if (!EMAIL_RE.test(email)) {
    return { ok: false, error: "That email address doesn't look right." };
  }
  if (name.length > 120 || email.length > 200 || institution.length > 200 || message.length > 5000) {
    return { ok: false, error: "Please keep your message under 5,000 characters." };
  }
  // Public and unauthenticated, so capped per network address.
  if (!(await consume(`contact:ip:${await requestIp()}`, LIMITS.contactForm))) {
    return { ok: false, error: "Too many messages from your network. Please try again later, or email hello@praxxt.com." };
  }

  const result = await sendEmail({
    to: CONTACT_EMAIL,
    // One line: a subject can't carry line breaks into the email headers.
    subject: `Demo request from ${name}${institution ? ` (${institution})` : ""}`.replace(/[\r\n]+/g, " "),
    html: `
      <div style="font-family: sans-serif;">
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Institution:</strong> ${escapeHtml(institution) || "—"}</p>
        <p><strong>Message:</strong></p>
        <p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>
      </div>
    `,
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  return { ok: true };
}
