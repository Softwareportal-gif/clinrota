"use server";

import { sendEmail } from "@/lib/email";

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

  const result = await sendEmail({
    to: CONTACT_EMAIL,
    subject: `Demo request from ${name}${institution ? ` (${institution})` : ""}`,
    html: `
      <div style="font-family: sans-serif;">
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Institution:</strong> ${institution || "—"}</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, "<br>")}</p>
      </div>
    `,
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  return { ok: true };
}
