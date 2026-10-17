// Shared FAQ content — the single source of truth for both the /help page
// (src/app/help/page.tsx) and Beatrice's system prompt (src/lib/assistant.ts).
// Edit here only; both places import this so they can't drift apart.

export type FaqItem = { question: string; answer: string };

export const LOGIN_ACCESS_FAQ: FaqItem[] = [
  {
    question: "I haven't received my invitation email",
    answer:
      "Check your spam or junk folder for an email from Praxxt <onboarding@resend.dev>. If it's genuinely not there, ask your program coordinator to confirm they sent your invitation, or to send it again — coordinators can resend invitations from their student or supervisor list.",
  },
  {
    question: `I'm getting "Incorrect email or password"`,
    answer:
      "Most Praxxt accounts don't actually have a password set — coordinators add students and supervisors by email only. If you've never explicitly set a password, use \"Email me a sign-in link\" on the login page instead of the password field — it signs you in directly from your inbox, no password needed. If you do have a password, double-check you're using the exact email address you were invited with and that Caps Lock isn't on (passwords are case-sensitive).",
  },
  {
    question: "I forgot my password",
    answer:
      'There isn\'t a separate password-reset page yet, but you likely don\'t need one: on the login page, use "Email me a sign-in link" with your account\'s email address, and you\'ll be signed in without entering a password at all. If your program specifically set you up with a password and you\'d rather keep using one, contact your program coordinator — password resets go through them for now.',
  },
  {
    question: "My account was just added but I can't log in yet",
    answer:
      "Being added by your coordinator is the first step, not the last. Check your email (including spam) for an invitation from Praxxt and use the sign-in link inside it — once you've signed in that way at least once, your account is fully active and you can sign in normally from then on.",
  },
  {
    question: "I don't have an account yet",
    answer:
      "Praxxt accounts are created by your program coordinator (or your institution's admin) when you're added to a program — there's no public sign-up page. If you're a student or supervisor who should have access, ask your program coordinator to add you.",
  },
  {
    question: "I can log in but my dashboard doesn't look right / I have the wrong role",
    answer:
      "What you see after signing in depends on the role your coordinator assigned when they added you (student, supervisor, or coordinator). If that looks wrong, contact your program coordinator to have it corrected — roles aren't something you can switch yourself.",
  },
];

// Short, accurate description for Beatrice's system prompt — every claim
// here already appears on the public landing page (src/app/landing-page.tsx)
// or this FAQ; nothing new is asserted here.
export const PRODUCT_DESCRIPTION = `Praxxt is a clinical education management platform that replaces paper logbooks for health training programs in nursing, midwifery, medicine, physiotherapy, pharmacy and physician associate studies, each with its own evaluation rubric and logbook fields. Students log clinical cases in SOAP format (Subjective/Objective/Assessment/Plan), track their hours, and can download a supervisor-verified CV; supervisors review and sign off on entries and rate the student's entrustment level; coordinators manage rotations and placements and see each cohort's competency coverage; the app works offline and syncs automatically when connectivity returns; and compliance documents (BLS/CPR, immunization records, background checks) are tracked with expiry warnings. Praxxt is currently piloting with St. John of God College of Health. There is no public self-serve sign-up — accounts are created by a program coordinator or institution admin.`;
