import { Resend } from "resend";

// Nothing in this codebase sent a custom email before this — the only
// existing Resend usage is NextAuth's own `Resend` *provider* in
// src/auth.ts, which handles magic-link sign-in emails internally and
// isn't reusable for an arbitrary "you've been invited" message. This is
// a small, direct use of the same already-configured Resend account.

export type SendEmailResult = { ok: true } | { ok: false; error: string };

// User-facing messages only — never the raw SDK/exception text, which can
// contain internal implementation detail ("Pass it to the constructor..."
// style messages). The real error always goes to console.error for our
// own debugging; only these two ever reach a coordinator's screen.
const CONFIG_ERROR_MESSAGE = "Email service is not configured. Contact your system administrator.";
const GENERIC_SEND_ERROR_MESSAGE = "Couldn't send this email. Try again or contact your system administrator.";

// Resend's own structured error codes for "the API key itself is the
// problem" (as opposed to e.g. a bad recipient address or rate limiting).
const CONFIG_ERROR_CODES = new Set(["missing_api_key", "invalid_api_key", "restricted_api_key"]);

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<SendEmailResult> {
  try {
    // Constructed inside the try, not at module scope — the Resend
    // constructor throws synchronously (not just at send time) when the
    // API key is missing/empty, and that needs to become a per-recipient
    // "failed to send" result, not an unhandled 500 that takes the whole
    // batch down with it.
    const resend = new Resend(process.env.RESEND_API_KEY);
    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM ?? "ClinRota <onboarding@resend.dev>",
      to,
      subject,
      html,
    });
    if (result.error) {
      console.error(`[email] Resend API error sending to ${to}:`, result.error);
      const isConfigError = CONFIG_ERROR_CODES.has(result.error.name);
      return { ok: false, error: isConfigError ? CONFIG_ERROR_MESSAGE : GENERIC_SEND_ERROR_MESSAGE };
    }
    return { ok: true };
  } catch (err) {
    console.error(`[email] Failed to send to ${to}:`, err);
    // The constructor's synchronous throw for a missing/empty key is a
    // plain Error, not a structured result — the message text itself is
    // the only signal, so a substring check is the practical way to
    // distinguish "the key is the problem" from some other thrown error
    // (e.g. a network failure) without leaking either one's raw text.
    const message = err instanceof Error ? err.message : "";
    const isConfigError = message.toLowerCase().includes("api key");
    return { ok: false, error: isConfigError ? CONFIG_ERROR_MESSAGE : GENERIC_SEND_ERROR_MESSAGE };
  }
}

// The student invite email doesn't carry its own sign-in token — it just
// points them at the login page's existing "Email me a sign-in link"
// magic-link option, which already works for any User row regardless of
// whether passwordHash is set. Simpler and safer than trying to mint a
// NextAuth verification token administratively from outside a real
// sign-in request.
// Ward supervisor's assignment notification — points at the same
// magic-link login as the student invite, for the same reason (no admin-
// minted token; whoever is signed in as this User can already use it).
export function wardSupervisorAssignedEmailHtml({
  supervisorName,
  studentName,
  wardName,
  clinicalSiteName,
  loginUrl,
}: {
  supervisorName: string;
  studentName: string;
  wardName: string;
  clinicalSiteName: string;
  loginUrl: string;
}): string {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>You've been assigned as a ward supervisor</h2>
      <p>Hi ${supervisorName},</p>
      <p>
        ${studentName} has started logging cases on ${wardName} at ${clinicalSiteName} with you
        as their ward supervisor. You'll review their case entries from this ward — their main
        clinical supervisor still handles overall grading.
      </p>
      <p>
        To sign in, go to <a href="${loginUrl}">${loginUrl}</a> and use
        "Email me a sign-in link" with this same email address — no password needed.
      </p>
      <p>See you there.</p>
    </div>
  `;
}

// Same shape/wording pattern as studentInviteEmailHtml — a supervisor
// account created by a coordinator (either a brand-new hire, or added
// specifically as a ward supervisor) rather than seeded.
export function supervisorInviteEmailHtml({
  supervisorName,
  institutionName,
  loginUrl,
}: {
  supervisorName: string;
  institutionName: string;
  loginUrl: string;
}): string {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>You've been added to ClinRota</h2>
      <p>Hi ${supervisorName},</p>
      <p>
        ${institutionName} has set up your ClinRota supervisor account so you can review
        and sign off on students' clinical case entries.
      </p>
      <p>
        To sign in, go to <a href="${loginUrl}">${loginUrl}</a> and use
        "Email me a sign-in link" with this same email address — no password needed.
      </p>
      <p>See you there.</p>
    </div>
  `;
}

export function studentInviteEmailHtml({
  studentName,
  programName,
  loginUrl,
}: {
  studentName: string;
  programName: string;
  loginUrl: string;
}): string {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>You've been added to ClinRota</h2>
      <p>Hi ${studentName},</p>
      <p>
        Your clinical program (${programName}) has set up your ClinRota account so you can
        start logging clinical cases and tracking your rotations.
      </p>
      <p>
        To sign in, go to <a href="${loginUrl}">${loginUrl}</a> and use
        "Email me a sign-in link" with this same email address — no password needed.
      </p>
      <p>See you there.</p>
    </div>
  `;
}

// Sent to the admin contact address when any signed-in user creates a
// support ticket — includes enough about the submitter to reply directly
// without looking them up, since there's no in-app reply thread.
export function supportTicketEmailHtml({
  subject,
  description,
  submitterName,
  submitterEmail,
  submitterRole,
}: {
  subject: string;
  description: string;
  submitterName: string;
  submitterEmail: string;
  submitterRole: string;
}): string {
  return `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
      <h2>New support ticket: ${subject}</h2>
      <p>
        <strong>From:</strong> ${submitterName} (${submitterRole}) —
        <a href="mailto:${submitterEmail}">${submitterEmail}</a>
      </p>
      <p style="white-space: pre-wrap;">${description}</p>
    </div>
  `;
}
