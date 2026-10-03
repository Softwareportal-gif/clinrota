import Link from "next/link";
import Image from "next/image";
import { Sora } from "next/font/google";
import { Logo } from "@/components/logo";
import { SoapNoteIcon, OfflineSyncIcon, SignOffIcon, ComplianceIcon } from "@/components/how-it-works-icons";
import { NurseIcon, MidwiferyIcon, MedicineIcon, PharmacyIcon, PhysiotherapyIcon } from "@/components/who-its-for-icons";
import { LinkedInIcon, FacebookIcon, InstagramIcon, YouTubeIcon } from "@/components/social-icons";
import { ContactForm } from "./contact-form";

const sora = Sora({ subsets: ["latin"], weight: ["600", "800"] });

// Deep teal is the same brand family as the logo's original teal
// (#0E6F63), just darker/richer — used for the nav bar, footer, and every
// heading. Coral is the one bold accent, used sparingly: the primary CTA
// and small decorative accents (underline bars, active pills) only —
// never a large fill or a second background color.
const DEEP_TEAL = "#0A3F38";
const CORAL = "#E8734A";
const CREAM = "#F3EFE7";
const INK = "#10201C";
// A desaturated step toward grey from DEEP_TEAL — used only for
// not-yet-onboarded discipline cards, kept in the teal family (not plain
// grey) so it still reads as "planned", not "broken" or off-brand.
const MUTED_TEAL = "#7E948E";
// Footer-only darker steps down from DEEP_TEAL — no existing Tailwind/CSS
// theme tokens for these (checked src/app/globals.css and found none), so
// they're plain hex like the rest of this page's palette constants.
const FOOTER_DARK = "#06231E";
const FOOTER_MID = "#123B33";

const CONTACT_EMAIL = "hello@clinrota.com";
const PILOT_INSTITUTION = "St. John of God College of Health";

// Data, not hardcoded JSX — adding a second/third real confirmed partner
// later is just appending a row here and dropping in a logo file at
// public/images/partners/. Rendered as a looping marquee (see the
// "Trusted by..." section below) regardless of length, so a lone entry
// today just means the same one name repeats as it loops — never padded
// with anything fake to look fuller than it is.
const PARTNERS: { name: string; location: string | null; logoSrc: string | null }[] = [
  { name: PILOT_INSTITUTION, location: "Ghana", logoSrc: "/images/partners/st-john-of-god-logo.webp" },
];

type Partner = { name: string; location: string | null; logoSrc: string | null };

function PartnerCard({ partner }: { partner: Partner }) {
  return (
    <div
      className="flex max-w-xl shrink-0 items-start gap-4 rounded-2xl border bg-white p-6 text-left shadow-sm"
      style={{ borderColor: "rgba(10,63,56,0.15)" }}
    >
      <div
        className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: "rgba(10,63,56,0.08)" }}
      >
        {partner.logoSrc ? (
          <Image
            src={partner.logoSrc}
            alt={`${partner.name} crest`}
            width={40}
            height={40}
            className="h-10 w-10 object-contain"
          />
        ) : (
          // Fallback for any future partner added before their logo file
          // is ready — see the PARTNERS array above.
          <InstitutionPlaceholderIcon className="h-8 w-8" />
        )}
      </div>
      <div>
        <p className="text-base font-bold whitespace-nowrap" style={{ color: DEEP_TEAL }}>
          {partner.name}
        </p>
        {partner.location && <p className="mt-0.5 text-sm text-gray-500">{partner.location}</p>}
        <p className="mt-2 max-w-xs text-sm leading-relaxed text-gray-600">
          Among the first health training colleges piloting ClinRota in Ghana.
        </p>
      </div>
    </div>
  );
}

// Placeholder mark for a partner with no logo file yet — a plain
// building/institution outline, not a stand-in for any specific crest.
function InstitutionPlaceholderIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M24,6 L42,16 V20 H6 V16 Z" fill="none" stroke={DEEP_TEAL} strokeWidth="3" strokeLinejoin="round" />
      <rect x="9" y="20" width="30" height="20" fill="none" stroke={DEEP_TEAL} strokeWidth="3" />
      <line x1="6" y1="40" x2="42" y2="40" stroke={DEEP_TEAL} strokeWidth="3" strokeLinecap="round" />
      <line x1="17" y1="24" x2="17" y2="36" stroke={DEEP_TEAL} strokeWidth="3" strokeLinecap="round" />
      <line x1="24" y1="24" x2="24" y2="36" stroke={DEEP_TEAL} strokeWidth="3" strokeLinecap="round" />
      <line x1="31" y1="24" x2="31" y2="36" stroke={DEEP_TEAL} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

const HOW_IT_WORKS = [
  {
    title: "SOAP-format digital logbook",
    body: "Students log every clinical case as a structured Subjective / Objective / Assessment / Plan entry — the same format they're already trained to think in, just digital instead of paper.",
    Icon: SoapNoteIcon,
  },
  {
    title: "Works with no signal",
    body: "Offline-first for real clinical sites: a case entry, a timesheet, a supervisor sign-off all queue locally and sync automatically the moment connectivity comes back.",
    Icon: OfflineSyncIcon,
  },
  {
    title: "Supervisor sign-off & entrustment tracking",
    body: "Supervisors review and sign off every case, rating the student's entrustment level — the record of how much supervision a student actually needed, not just that a case happened.",
    Icon: SignOffIcon,
  },
  {
    title: "Compliance, tracked automatically",
    body: "BLS/CPR certification, immunization records, background checks — every required document, with expiry warnings before they lapse, not after.",
    Icon: ComplianceIcon,
  },
];

const WHO_ITS_FOR = [
  { name: "Nursing", available: true, Icon: NurseIcon },
  { name: "Midwifery", available: true, Icon: MidwiferyIcon },
  { name: "Medicine", available: false, Icon: MedicineIcon },
  { name: "Pharmacy", available: false, Icon: PharmacyIcon },
  { name: "Physiotherapy", available: false, Icon: PhysiotherapyIcon },
];

export function LandingPage() {
  return (
    <div className={sora.className} style={{ backgroundColor: "#FFFFFF", color: INK }}>
      {/* Nav — full-width deep teal bar */}
      <header className="sticky top-0 z-10" style={{ backgroundColor: DEEP_TEAL }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            aria-label="ClinRota home"
            className="flex w-fit items-center gap-2.5 transition hover:opacity-80"
          >
            <Logo size={32} />
            <span className="text-lg font-extrabold tracking-tight text-white">ClinRota</span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-semibold text-white/80 sm:flex">
            <a href="#how-it-works" className="hover:text-white">
              How it works
            </a>
            <a href="#who-its-for" className="hover:text-white">
              Who it&apos;s for
            </a>
            <a href="#contact" className="hover:text-white">
              Contact
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg border border-white/40 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Login
            </Link>
            <a
              href="#contact"
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
              style={{ backgroundColor: CORAL }}
            >
              Request a Demo
            </a>
          </div>
        </div>
      </header>

      {/* Hero — cream-to-white gradient, two-column with photo on the right */}
      <section style={{ background: `linear-gradient(to right, ${CREAM}, #FFFFFF)` }}>
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 sm:py-24 lg:grid-cols-2 lg:gap-10">
          <div className="text-center lg:text-left">
            <p
              className="text-sm font-bold uppercase tracking-widest"
              style={{ color: CORAL }}
            >
              For clinical training programs
            </p>
            <h1
              className="mt-3 text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-6xl"
              style={{ color: DEEP_TEAL }}
            >
              FROM PAPER LOGBOOKS
              <br />
              TO CLINICAL COMPETENCE
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-gray-600 lg:mx-0">
              Across Ghana&apos;s nursing, midwifery, medical, physiotherapy, and pharmacy programs,
              clinical students still track their entire rotation — cases, hours, supervisor
              sign-offs — on paper. ClinRota replaces the logbook, not the training.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-4 lg:justify-start">
              <a
                href="#contact"
                className="rounded-lg px-7 py-3.5 text-base font-semibold text-white shadow-sm transition hover:opacity-90"
                style={{ backgroundColor: CORAL }}
              >
                Request a Demo
              </a>
              <a
                href="#how-it-works"
                className="text-base font-semibold hover:opacity-70"
                style={{ color: DEEP_TEAL }}
              >
                See how it works →
              </a>
            </div>
          </div>

          <div className="relative aspect-[4/5] w-full max-w-md overflow-hidden rounded-2xl lg:mx-0 lg:justify-self-end">
            {/*
              The container is capped at max-w-md (28rem/448px) from the lg
              breakpoint up, not actually 50% of the viewport — sizes says
              448px there (not 50vw) so the browser doesn't over-fetch on
              wide screens. priority + blur placeholder because this is the
              page's LCP element; a bare "loading" gap here would be the
              first thing a visitor on slow hospital wifi sees.
            */}
            <Image
              src="/images/hero.jpg"
              alt="A group of clinical students in white coats and scrubs, stethoscopes around their necks, walking together and laughing down a hospital corridor"
              fill
              sizes="(min-width: 1024px) 448px, 100vw"
              className="object-cover"
              priority
              placeholder="blur"
              blurDataURL="data:image/jpeg;base64,/9j/2wBDABQODxIPDRQSEBIXFRQYHjIhHhwcHj0sLiQySUBMS0dARkVQWnNiUFVtVkVGZIhlbXd7gYKBTmCNl4x9lnN+gXz/2wBDARUXFx4aHjshITt8U0ZTfHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHz/wAARCAALABADASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAABQEC/8QAIBAAAgEEAQUAAAAAAAAAAAAAAQIDABESIQQFI0GBwv/EABUBAQEAAAAAAAAAAAAAAAAAAAEC/8QAGBEAAwEBAAAAAAAAAAAAAAAAAAERAiH/2gAMAwEAAhEDEQA/AGJJmLFVS5Qhb5Der1I5TLBKpS2SE3uD4ojkSuvKNmI7nya10t2MmJOsTr1UPKlFb7D/2Q=="
            />
            {/* Soft fade from the hero's cream backdrop into the photo's left edge */}
            <div
              className="pointer-events-none absolute inset-y-0 left-0 w-1/4"
              style={{ background: `linear-gradient(to right, ${CREAM}, transparent)` }}
              aria-hidden="true"
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2
            className="text-center text-sm font-extrabold uppercase tracking-widest"
            style={{ color: DEEP_TEAL }}
          >
            How it works
          </h2>
          <p
            className="mx-auto mt-3 max-w-xl text-center text-2xl font-extrabold sm:text-3xl"
            style={{ color: DEEP_TEAL }}
          >
            Everything a paper logbook does — plus everything it can&apos;t.
          </p>
          <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {HOW_IT_WORKS.map((item) => (
              <div key={item.title}>
                <item.Icon className="h-10 w-10" />
                <div
                  className="mb-4 mt-4 h-1.5 w-10 rounded-full"
                  style={{ backgroundColor: CORAL }}
                  aria-hidden="true"
                />
                <h3 className="text-lg font-bold" style={{ color: DEEP_TEAL }}>
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section id="who-its-for" className="px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <h2
            className="text-sm font-extrabold uppercase tracking-widest"
            style={{ color: DEEP_TEAL }}
          >
            Who it&apos;s for
          </h2>
          <p
            className="mt-3 max-w-md text-2xl font-extrabold leading-tight sm:text-3xl"
            style={{ color: DEEP_TEAL }}
          >
            Built for Every
            <br />
            Clinical Discipline
          </p>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-gray-600">
            ClinRota supports nursing and midwifery training today, with medicine, pharmacy, and
            physiotherapy coming as the pilot expands.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            {WHO_ITS_FOR.map((p) => {
              const color = p.available ? DEEP_TEAL : MUTED_TEAL;
              return (
                <div
                  key={p.name}
                  className="flex w-full items-center gap-3 rounded-2xl border bg-white px-5 py-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md sm:w-auto"
                  style={{ borderColor: "rgba(10,63,56,0.15)" }}
                >
                  <p.Icon className="h-6 w-6 shrink-0" color={color} />
                  <span className="text-base font-semibold whitespace-nowrap" style={{ color }}>
                    {p.name}
                    {!p.available && (
                      <span className="ml-1.5 text-xs font-medium italic" style={{ color: MUTED_TEAL }}>
                        · coming as we onboard
                      </span>
                    )}
                  </span>
                </div>
              );
            })}

            <div
              className="flex w-full items-center justify-center rounded-2xl border bg-white px-6 py-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md sm:w-auto sm:justify-start sm:rounded-full"
              style={{ borderColor: "rgba(232,115,74,0.5)" }}
            >
              <span className="text-base font-semibold italic whitespace-nowrap" style={{ color: CORAL }}>
                And more coming soon
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* "Trusted by..." — one real partner today, shown as a looping
          marquee so the strip is already shaped like a real "trusted by"
          row the moment a second/third confirmed partner is appended to
          PARTNERS above. The single card repeating as it loops is
          expected and honest — it's the same one name, not implying more
          partners than exist. See the @keyframes marquee rule in
          src/app/globals.css for the loop mechanics. */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <p
            className="text-sm font-bold uppercase tracking-widest"
            style={{ color: CORAL }}
          >
            Trusted by Leading Academic Institutions, Programs, and Sites
          </p>

          <div className="mt-8 flex overflow-hidden motion-reduce:justify-center">
            {/*
              Two structurally-identical groups, each with its own
              trailing spacer (pr-5, matching gap-5) rather than one flat
              list with a shared gap between them — that's what makes the
              two groups exactly equal width, so translateX(-50%) on the
              track lands precisely on the second group's start with no
              seam. (A flat `[...arr, ...arr]` list with a single shared
              gap is off by half a gap-width at the loop point.)
            */}
            <div className="flex w-max shrink-0 [animation:marquee_18s_linear_infinite] hover:[animation-play-state:paused] motion-reduce:animate-none">
              <div className="flex shrink-0 gap-5 pr-5">
                {PARTNERS.map((partner) => (
                  <PartnerCard key={partner.name} partner={partner} />
                ))}
              </div>
              {/* Duplicate group — aria-hidden (a screen reader shouldn't
                  hear the same partner announced twice) and dropped
                  entirely under prefers-reduced-motion, leaving a single
                  static, centered set of card(s) for anyone who's asked
                  not to see motion. */}
              <div className="flex shrink-0 gap-5 pr-5 motion-reduce:hidden" aria-hidden="true">
                {PARTNERS.map((partner) => (
                  <PartnerCard key={partner.name} partner={partner} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="px-6 py-20">
        <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-2">
          <div>
            <h2
              className="text-sm font-extrabold uppercase tracking-widest"
              style={{ color: DEEP_TEAL }}
            >
              Talk to us
            </h2>
            <p className="mt-3 text-2xl font-extrabold sm:text-3xl" style={{ color: DEEP_TEAL }}>
              We onboard institutions directly.
            </p>
            <p className="mt-4 max-w-md text-base leading-relaxed text-gray-600">
              There&apos;s no self-serve sign-up — we work with each program&apos;s coordinators
              to set up their competencies, rotations, and compliance requirements from day one.
              Tell us about your program and we&apos;ll take it from there.
            </p>
            <p className="mt-6 text-sm text-gray-500">
              Prefer email?{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold underline" style={{ color: CORAL }}>
                {CONTACT_EMAIL}
              </a>
            </p>
          </div>
          <ContactForm />
        </div>
      </section>

      {/* Footer — thin coral accent edge, then two dark-teal bands */}
      <footer>
        <div
          aria-hidden="true"
          style={{ height: "3px", background: `linear-gradient(to right, ${CORAL}, #F5B896)` }}
        />

        {/* Top band: social row (left), logo (right). The pilot-partner
            mention lives in the "Trusted by..." section now, not here
            too — removed per explicit request to avoid saying it twice. */}
        <div className="px-6 py-10" style={{ backgroundColor: FOOTER_DARK }}>
          <div className="mx-auto flex max-w-5xl flex-col-reverse items-center gap-8 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col items-center gap-4 sm:items-start">
              <div className="flex items-center gap-3">
                {[
                  // TODO: replace href="#" with the real LinkedIn URL once the account exists
                  { label: "LinkedIn", Icon: LinkedInIcon, href: "#" },
                  // TODO: replace href="#" with the real Facebook URL once the account exists
                  { label: "Facebook", Icon: FacebookIcon, href: "#" },
                  // TODO: replace href="#" with the real Instagram URL once the account exists
                  { label: "Instagram", Icon: InstagramIcon, href: "#" },
                  // TODO: replace href="#" with the real YouTube URL once the account exists
                  { label: "YouTube", Icon: YouTubeIcon, href: "#" },
                ].map(({ label, Icon, href }) => (
                  <a
                    key={label}
                    href={href}
                    aria-label={label}
                    className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-white/20"
                    style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
                  >
                    <Icon className="h-4 w-4" color="#F3EFE7" />
                  </a>
                ))}
              </div>
            </div>

            <Link
              href="/"
              aria-label="ClinRota home"
              className="flex w-fit items-center gap-2.5 transition hover:opacity-80"
            >
              <Logo size={32} />
              <span className="text-lg font-extrabold tracking-tight text-white">ClinRota</span>
            </Link>
          </div>
        </div>

        {/* Bottom band: contact (left), copyright (right) — no legal/policy
            links since none of those pages exist yet. */}
        <div className="px-6 py-5" style={{ backgroundColor: FOOTER_MID }}>
          <div className="mx-auto flex max-w-5xl flex-col items-center gap-2 text-sm text-white/60 sm:flex-row sm:justify-between">
            <p>
              Questions?{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-white/80 hover:text-white">
                {CONTACT_EMAIL}
              </a>
            </p>
            <p>© {new Date().getFullYear()} ClinRota</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
