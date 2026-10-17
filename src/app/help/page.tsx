import Link from "next/link";
import { auth } from "@/auth";
import { Wordmark } from "@/components/wordmark";
import { BackLink } from "@/components/back-link";
import { ROLE_HOME } from "@/lib/role-routes";
import { LOGIN_ACCESS_FAQ } from "@/lib/faq";
import { USING_PRAXXT_SECTIONS } from "@/lib/help-content";
import { PlayIcon, TicketIcon } from "./help-icons";

// Same palette as the landing page / login page — kept as local constants
// here too, matching how those two files already do it (no shared config
// yet, since nothing besides color values would be shared).
const INK = "#17153B";
const HIGHLIGHT = "#D63A74";

// Same address used everywhere else on the site (landing page contact
// section, login page footer link) — deliberately the one real address.
const CONTACT_EMAIL = "hello@praxxt.com";

// Exxat's "Quick Links" panel scoped down to what's actually real here —
// just these two. Do not add Community/Certification/etc. entries; that
// infrastructure doesn't exist for Praxxt.
function QuickLinksPanel({ isSignedIn }: { isSignedIn: boolean }) {
  return (
    <div className="space-y-3 lg:sticky lg:top-8">
      <h2 className="text-sm font-extrabold uppercase tracking-widest text-gray-500">
        Quick links
      </h2>

      <Link
        href="/help/training-videos"
        className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4 transition hover:border-gray-300 hover:shadow-sm"
      >
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: "rgba(10,63,56,0.08)" }}
        >
          <PlayIcon className="h-5 w-5" />
        </span>
        <span>
          <span className="block text-sm font-bold text-gray-900">Training videos</span>
          <span className="block text-xs text-gray-500">
            Walkthroughs for coordinators and admins.
          </span>
        </span>
      </Link>

      <Link
        href={isSignedIn ? "/help/tickets" : "/login?callbackUrl=/help/tickets"}
        className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4 transition hover:border-gray-300 hover:shadow-sm"
      >
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: "rgba(232,115,74,0.1)" }}
        >
          <TicketIcon className="h-5 w-5" color={HIGHLIGHT} />
        </span>
        <span>
          <span className="block text-sm font-bold text-gray-900">Create a ticket</span>
          <span className="block text-xs text-gray-500">
            {isSignedIn ? "Get help from our team." : "Sign in to create a ticket."}
          </span>
        </span>
      </Link>
    </div>
  );
}

export default async function HelpPage() {
  const session = await auth();
  const isSignedIn = !!session?.user;

  return (
    <div className="min-h-screen bg-white">
      <header className="px-6 py-4" style={{ backgroundColor: INK }}>
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link
            href="/"
            aria-label="Praxxt home"
            className="flex w-fit items-center gap-2.5 transition hover:opacity-80"
          >
            <Wordmark size={24} tone="onDark" />
          </Link>
          {session?.user?.role ? (
            <BackLink href={ROLE_HOME[session.user.role]} label="Back to dashboard" tone="onDark" />
          ) : (
            <BackLink href="/login" label="Back to sign in" tone="onDark" />
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="lg:grid lg:grid-cols-[280px_1fr] lg:items-start lg:gap-12">
          <div className="mb-10 lg:mb-0">
            <QuickLinksPanel isSignedIn={isSignedIn} />
          </div>

          <div>
            <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: INK }}>
              Help &amp; troubleshooting
            </h1>
            <p className="mt-2 text-base text-gray-600">
              Answers to common questions about signing in and using Praxxt.
            </p>

            <section id="login-access" className="mt-10 scroll-mt-6">
              <h2 className="text-sm font-extrabold uppercase tracking-widest" style={{ color: HIGHLIGHT }}>
                Login &amp; access
              </h2>
              <dl className="mt-6 space-y-8">
                {LOGIN_ACCESS_FAQ.map((item) => (
                  <div key={item.question}>
                    <dt className="text-lg font-bold text-gray-900">{item.question}</dt>
                    <dd className="mt-2 text-base leading-relaxed text-gray-600">{item.answer}</dd>
                  </div>
                ))}
              </dl>
            </section>

            {USING_PRAXXT_SECTIONS.map((section) => (
              <section key={section.id} id={section.id} className="mt-14 scroll-mt-6">
                <h2 className="text-sm font-extrabold uppercase tracking-widest" style={{ color: HIGHLIGHT }}>
                  {section.title}
                </h2>
                <dl className="mt-6 space-y-8">
                  {section.items.map((item) => (
                    <div key={item.question}>
                      <dt className="text-lg font-bold text-gray-900">{item.question}</dt>
                      <dd className="mt-2 text-base leading-relaxed text-gray-600">{item.answer}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}

            <section className="mt-14 border-t border-gray-100 pt-10">
              <h2 className="text-sm font-extrabold uppercase tracking-widest" style={{ color: HIGHLIGHT }}>
                Still stuck?
              </h2>
              <p className="mt-4 text-base text-gray-600">
                Email us and we&apos;ll help you sort it out —{" "}
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="font-semibold underline"
                  style={{ color: INK }}
                >
                  {CONTACT_EMAIL}
                </a>
                .
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
