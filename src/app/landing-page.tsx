import Link from "next/link";
import Image from "next/image";
import { manrope } from "@/fonts/manrope";
import { Wordmark } from "@/components/wordmark";
import { LinkedInIcon, FacebookIcon, InstagramIcon, YouTubeIcon } from "@/components/social-icons";
import { ContactForm } from "./contact-form";

const INK = "#17153B";
const BODY = "#4A4867";
const MUTED = "#6B6987";
const VIOLET = "#5A3BF0";
const BLUE = "#2563EB";
const LINE = "#ECEBF5";
const BRAND_GRADIENT = `linear-gradient(90deg, ${VIOLET}, ${BLUE})`;
const TEXT_GRADIENT = `linear-gradient(90deg, ${VIOLET}, ${BLUE} 55%, #0E9FB3)`;
const HERO_BLEND =
  "radial-gradient(ellipse at 12% 18%, rgba(90,59,240,.20), transparent 46%), radial-gradient(ellipse at 88% 12%, rgba(18,181,201,.22), transparent 44%), radial-gradient(ellipse at 72% 92%, rgba(255,92,138,.14), transparent 48%), #F8F7FF";

const CONTACT_EMAIL = "hello@praxxt.com";

// Real, confirmed pilot partners only — append a row (and its logo under
// public/images/partners/) as each new partner signs on; never pad this.
// `show: false` keeps a partner off the site until the agreement is
// confirmed with them; the "Piloting with" strip disappears when none show.
const PARTNERS: { name: string; logoSrc: string; show: boolean }[] = [
  { name: "St. John of God College of Health", logoSrc: "/images/partners/st-john-of-god-logo.webp", show: false },
];
const SHOWN_PARTNERS = PARTNERS.filter((p) => p.show);

const MODULES = [
  {
    title: "Clinical Logbook",
    body: "Structured SOAP case entries mapped to your competency framework, with entrustment levels rated by supervisors.",
    gradient: "linear-gradient(135deg, #5A3BF0, #8B6BFF)",
    linkColor: VIOLET,
    icon: <path d="M5 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2zM9 8h6M9 12h6M9 16h3" />,
  },
  {
    title: "Rotations & Placements",
    body: "Assign rotations, collect student site preferences, and track supervised hours at every clinical site.",
    gradient: "linear-gradient(135deg, #2563EB, #4FA3FF)",
    linkColor: BLUE,
    icon: (
      <>
        <path d="M12 21s-7-4.5-7-10a7 7 0 0 1 14 0c0 5.5-7 10-7 10z" />
        <circle cx="12" cy="11" r="2.4" />
      </>
    ),
  },
  {
    title: "Compliance & Records",
    body: "Verify required documents before placements start, and give every student a supervisor-verified CV.",
    gradient: "linear-gradient(135deg, #0E9FB3, #3FD0C9)",
    linkColor: "#0B7F8F",
    icon: <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6zM9 12l2 2 4-4" />,
  },
];

// Each has a discipline template (rubric + logbook fields) an admin can pick
// when creating a program — see prisma/migrations/*discipline_templates*.
const DISCIPLINES = ["Nursing", "Midwifery", "Medicine", "Physiotherapy", "Pharmacy", "Physician Assistant"];

const REASONS = [
  {
    title: "Offline-first on the ward",
    body: "Students log cases with no signal; records sync automatically when they reconnect.",
    bar: `linear-gradient(90deg, ${VIOLET}, ${BLUE})`,
  },
  {
    title: "Verified at every step",
    body: "Cases, hours and documents count only once a supervisor or coordinator signs off.",
    bar: `linear-gradient(90deg, ${BLUE}, #12B5C9)`,
  },
  {
    title: "Competency-based by design",
    body: "Live coverage shows exactly which competencies each student and cohort still needs.",
    bar: "linear-gradient(90deg, #12B5C9, #3FD0C9)",
  },
  {
    title: "Hands-on onboarding",
    body: "We set up your cohorts, sites and competency framework with your team.",
    bar: `linear-gradient(90deg, #FF5C8A, ${VIOLET})`,
  },
];

const SECURITY = [
  { title: "Role-based access", body: "Students, supervisors and coordinators see only what their role allows." },
  { title: "Private document storage", body: "Compliance files are never public and open only to authorised users." },
  { title: "Full audit trail", body: "Every review, sign-off and change is recorded with who and when." },
  { title: "Encrypted in transit", body: "All traffic runs over HTTPS, on every device." },
];

// An account without a URL yet is hidden rather than rendered as a dead link.
const SOCIALS = [
  { label: "LinkedIn", Icon: LinkedInIcon, href: "https://www.linkedin.com/company/praxxt" },
  { label: "Facebook", Icon: FacebookIcon, href: "https://www.facebook.com/profile.php?id=61595247760565" },
  { label: "Instagram", Icon: InstagramIcon, href: "https://www.instagram.com/pra__xxt/" },
  { label: "YouTube", Icon: YouTubeIcon, href: null },
].filter((s): s is typeof s & { href: string } => s.href !== null);

function Eyebrow({ children, color = VIOLET }: { children: React.ReactNode; color?: string }) {
  return (
    <p className="text-xs font-extrabold uppercase tracking-[0.14em]" style={{ color }}>
      {children}
    </p>
  );
}

function DashboardPreview() {
  const rows = [
    { name: "Maya Thompson", placement: "St. Mary's · Medicine", hours: 48, status: "On track", ok: true },
    { name: "Luis Romero", placement: "Northside · Maternity", hours: 32, status: "Needs documents", ok: false },
  ];
  return (
    <div
      className="mx-auto mt-12 hidden w-full max-w-5xl rounded-t-3xl bg-white px-3.5 pt-3.5 text-left sm:block"
      style={{ boxShadow: "0 30px 70px rgba(37,32,110,.16)" }}
      aria-hidden="true"
    >
      <div className="flex gap-1.5 px-1.5 pb-3.5 pt-1">
        <span className="h-2.5 w-2.5 rounded-full bg-[#FF6B6B]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#FFC34D]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#38D39F]" />
      </div>
      <div className="flex gap-3.5 pb-0">
        <div className="hidden w-48 shrink-0 flex-col gap-1 rounded-2xl p-3 text-sm font-semibold md:flex" style={{ backgroundColor: "#F7F6FC" }}>
          <span className="px-2.5 pb-2 text-[11px] font-extrabold uppercase tracking-widest" style={{ color: MUTED }}>
            Coordinator
          </span>
          <span className="rounded-lg px-2.5 py-2" style={{ background: "linear-gradient(90deg, rgba(90,59,240,.12), rgba(37,99,235,.10))", color: "#4A3BB5" }}>
            Cohort overview
          </span>
          {["Rotations", "Competencies", "Compliance"].map((item) => (
            <span key={item} className="px-2.5 py-2" style={{ color: BODY }}>
              {item}
            </span>
          ))}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-3 pb-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-lg font-extrabold">BSc Nursing · Year 3</span>
            <span className="text-xs" style={{ color: MUTED }}>
              Illustrative sample data
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl p-4 text-white" style={{ background: `linear-gradient(135deg, ${VIOLET}, ${BLUE})` }}>
              <div className="text-xs opacity-90">Competency coverage</div>
              <div className="mt-1 text-3xl font-extrabold">72%</div>
            </div>
            <div className="rounded-2xl p-4" style={{ backgroundColor: "#F7F6FC" }}>
              <div className="text-xs" style={{ color: MUTED }}>Awaiting sign-off</div>
              <div className="mt-1 text-3xl font-extrabold">14</div>
            </div>
            <div className="rounded-2xl p-4" style={{ backgroundColor: "#F7F6FC" }}>
              <div className="text-xs" style={{ color: MUTED }}>Approved hours</div>
              <div className="mt-1 text-3xl font-extrabold">1,284</div>
            </div>
          </div>
          <div className="rounded-2xl border px-4" style={{ borderColor: LINE }}>
            <div className="grid grid-cols-[2fr_2fr_1fr_1.3fr] border-b py-2.5 text-[11px] font-extrabold uppercase tracking-wider" style={{ borderColor: LINE, color: MUTED }}>
              <span>Student</span>
              <span>Placement</span>
              <span>Hours</span>
              <span>Status</span>
            </div>
            {rows.map((r, i) => (
              <div
                key={r.name}
                className={`grid grid-cols-[2fr_2fr_1fr_1.3fr] items-center py-2.5 text-sm ${i < rows.length - 1 ? "border-b" : ""}`}
                style={{ borderColor: "#F1F0F8" }}
              >
                <span className="font-semibold">{r.name}</span>
                <span style={{ color: BODY }}>{r.placement}</span>
                <span>{r.hours}</span>
                <span
                  className="justify-self-start rounded-full px-2.5 py-1 text-xs font-bold"
                  style={r.ok ? { color: "#0E7A55", backgroundColor: "#E5F7EF" } : { color: "#9A5A00", backgroundColor: "#FFF2DC" }}
                >
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function LandingPage() {
  return (
    <div className={manrope.className} style={{ backgroundColor: "#FFFFFF", color: INK }}>
      <div className="px-6 py-2.5 text-[13px] font-medium text-white" style={{ background: `linear-gradient(90deg, ${VIOLET}, ${BLUE} 55%, #0E8FA3)` }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <p>
            New: verified clinical CVs for every student.{" "}
            <a href="#platform" className="font-bold underline">
              See how it works
            </a>
          </p>
          <div className="hidden items-center gap-6 sm:flex">
            <a href="#contact" className="hover:opacity-80">Contact us</a>
            <Link href="/help" className="hover:opacity-80">Support</Link>
            <Link href="/login" className="font-bold hover:opacity-80">Log in</Link>
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-20 border-b bg-white/95 backdrop-blur" style={{ borderColor: LINE }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3.5 sm:gap-6 sm:px-6 sm:py-4">
          <Link href="/" aria-label="Praxxt home" className="shrink-0 transition hover:opacity-80">
            <Wordmark size={27} />
          </Link>
          <nav className="hidden items-center gap-8 text-[15px] font-bold md:flex">
            <a href="#platform" className="transition-colors hover:text-[#5A3BF0]">Platform</a>
            <a href="#disciplines" className="transition-colors hover:text-[#5A3BF0]">Disciplines</a>
            <a href="#security" className="transition-colors hover:text-[#5A3BF0]">Security</a>
            <Link href="/help" className="transition-colors hover:text-[#5A3BF0]">Resources</Link>
          </nav>
          {/* Log in stays visible on phones too (an outlined pill there), so
              students and supervisors can always reach their account. */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="whitespace-nowrap rounded-full border border-[#DCD8F5] px-4 py-2 text-sm font-bold transition hover:border-[#5A3BF0] hover:text-[#5A3BF0] sm:border-transparent sm:px-2 sm:text-[15px] sm:hover:border-transparent"
            >
              Log in
            </Link>
            <a
              href="#contact"
              className="whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold text-white transition duration-200 hover:shadow-[0_8px_20px_rgba(90,59,240,.35)] motion-safe:hover:-translate-y-0.5 sm:px-5 sm:py-3 sm:text-[15px]"
              style={{ background: BRAND_GRADIENT }}
            >
              Book a demo
            </a>
          </div>
        </div>
      </header>

      <section className="px-6 pt-16 sm:pt-24" style={{ background: HERO_BLEND }}>
        <div className="mx-auto flex max-w-6xl flex-col items-center text-center">
          <span className="inline-flex items-center gap-2 rounded-full border bg-white px-4 py-1.5 text-[13px] font-bold" style={{ borderColor: "#E2DEFB", color: "#4A3BB5" }}>
            <span className="h-2 w-2 rounded-full" style={{ background: "linear-gradient(135deg, #5A3BF0, #12B5C9)" }} />
            Clinical education management platform
          </span>
          <h1 className="mt-6 max-w-4xl text-4xl font-extrabold leading-[1.05] tracking-[-0.035em] sm:text-6xl lg:text-7xl">
            Every placement, every competency,{" "}
            <span style={{ background: TEXT_GRADIENT, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
              one connected record.
            </span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed sm:text-xl" style={{ color: BODY }}>
            Praxxt brings students, clinical supervisors and program coordinators onto one platform for
            logbooks, placements, sign-offs and compliance.
          </p>
          <div className="mt-9 flex flex-col gap-3 pb-16 sm:flex-row sm:pb-0">
            <a
              href="#contact"
              className="rounded-full px-7 py-4 text-base font-bold text-white transition duration-200 hover:brightness-110 motion-safe:hover:-translate-y-0.5"
              style={{ background: BRAND_GRADIENT, boxShadow: "0 10px 24px rgba(90,59,240,.28)" }}
            >
              Book a demo →
            </a>
            <a href="#platform" className="rounded-full border bg-white px-7 py-4 text-base font-bold transition duration-200 hover:border-[#5A3BF0] hover:text-[#5A3BF0] hover:shadow-[0_8px_20px_rgba(37,32,110,.10)] motion-safe:hover:-translate-y-0.5" style={{ borderColor: "#DCD8F5" }}>
              Explore the platform
            </a>
          </div>
          <DashboardPreview />
        </div>
      </section>

      {SHOWN_PARTNERS.length > 0 && (
        <section className="border-b px-6 py-10" style={{ borderColor: LINE }}>
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 sm:flex-row sm:gap-10">
            <p className="whitespace-nowrap text-base font-bold" style={{ color: BODY }}>
              Piloting with
            </p>
            <div className="flex flex-wrap items-center justify-center gap-8">
              {SHOWN_PARTNERS.map((p) => (
                <div key={p.name} className="flex items-center gap-3">
                  <Image src={p.logoSrc} alt={`${p.name} crest`} width={44} height={44} className="h-11 w-11 object-contain" />
                  <span className="text-base font-bold">{p.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section id="platform" className="scroll-mt-24 px-6 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
            <Eyebrow>The Praxxt platform</Eyebrow>
            <h2 className="text-3xl font-extrabold leading-tight tracking-[-0.03em] sm:text-5xl">
              One platform for the whole clinical training journey
            </h2>
            <p className="text-lg leading-relaxed" style={{ color: BODY }}>
              Three connected modules replace the paper logbook, the placement spreadsheet and the compliance folder.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {MODULES.map((m) => (
              <div
                key={m.title}
                className="group flex flex-col gap-4 rounded-3xl border border-[#ECEBF5] bg-white p-8 shadow-[0_12px_30px_rgba(37,32,110,.06)] transition duration-300 hover:border-[#D7D1FB] hover:shadow-[0_24px_48px_rgba(37,32,110,.14)] motion-safe:hover:-translate-y-1.5"
              >
                <span
                  className="flex h-14 w-14 items-center justify-center rounded-2xl transition duration-300 motion-safe:group-hover:-rotate-6 motion-safe:group-hover:scale-110"
                  style={{ background: m.gradient }}
                >
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    {m.icon}
                  </svg>
                </span>
                <h3 className="text-2xl font-extrabold tracking-[-0.02em]">{m.title}</h3>
                <p className="leading-relaxed" style={{ color: BODY }}>{m.body}</p>
                <a href="#contact" className="mt-auto inline-flex items-center gap-1 text-[15px] font-bold" style={{ color: m.linkColor }}>
                  See it in a demo
                  <span aria-hidden="true" className="transition-transform duration-300 motion-safe:group-hover:translate-x-1.5">
                    →
                  </span>
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="disciplines"
        className="scroll-mt-24 px-6 py-20"
        style={{ background: "radial-gradient(ellipse at 90% 0%, rgba(18,181,201,.14), transparent 50%), radial-gradient(ellipse at 0% 100%, rgba(90,59,240,.12), transparent 50%), #F8F7FF" }}
      >
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="flex flex-col gap-3">
              <Eyebrow>Disciplines</Eyebrow>
              <h2 className="text-3xl font-extrabold leading-tight tracking-[-0.03em] sm:text-[42px]">
                Purpose-built for the health professions
              </h2>
            </div>
            <p className="max-w-md leading-relaxed" style={{ color: BODY }}>
              Each discipline gets its own competency framework, logbook fields and evaluation rubric.
            </p>
          </div>
          <div className="mt-9 flex flex-wrap gap-3.5">
            {DISCIPLINES.map((name) => (
              <span
                key={name}
                className="group flex items-center gap-2.5 rounded-full bg-white px-6 py-3.5 text-[17px] font-bold shadow-[0_2px_6px_rgba(37,32,110,.07)] ring-1 ring-transparent transition duration-300 hover:shadow-[0_10px_24px_rgba(90,59,240,.18)] hover:ring-[#5A3BF0]/30 motion-safe:hover:-translate-y-1"
                style={{ color: INK }}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full transition-transform duration-300 motion-safe:group-hover:scale-150"
                  style={{ background: "linear-gradient(135deg, #5A3BF0, #12B5C9)" }}
                />
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="flex max-w-3xl flex-col gap-3.5">
            <Eyebrow>Why Praxxt</Eyebrow>
            <h2 className="text-3xl font-extrabold leading-tight tracking-[-0.03em] sm:text-5xl">
              Built for how clinical training actually happens
            </h2>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {REASONS.map((r) => (
              <div
                key={r.title}
                className="group flex flex-col gap-3 rounded-3xl bg-[#F8F7FF] p-7 ring-1 ring-transparent transition duration-300 hover:bg-white hover:shadow-[0_20px_40px_rgba(37,32,110,.12)] hover:ring-[#ECEBF5] motion-safe:hover:-translate-y-1.5"
              >
                <span
                  className="h-1.5 w-9 rounded-full transition-all duration-300 group-hover:w-16"
                  style={{ background: r.bar }}
                  aria-hidden="true"
                />
                <h3 className="text-lg font-extrabold">{r.title}</h3>
                <p className="leading-relaxed" style={{ color: BODY }}>{r.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="security" className="scroll-mt-24 px-6">
        <div
          className="mx-auto grid max-w-6xl items-center gap-10 rounded-[30px] px-8 py-14 text-white sm:px-14 lg:grid-cols-[5fr_7fr] lg:gap-14"
          style={{ background: "radial-gradient(ellipse at 100% 0%, rgba(18,181,201,.35), transparent 55%), radial-gradient(ellipse at 0% 100%, rgba(255,92,138,.22), transparent 55%), linear-gradient(135deg, #2A1C8F, #1E3FAE)" }}
        >
          <div className="flex flex-col gap-4">
            <Eyebrow color="#A9F0EA">Security &amp; privacy</Eyebrow>
            <h2 className="text-3xl font-extrabold leading-tight tracking-[-0.03em] sm:text-[42px]">
              Student records deserve serious protection
            </h2>
            <p className="text-lg leading-relaxed text-[#DCE2FF]">Built from day one to keep health and training records private.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {SECURITY.map((s) => (
              <div
                key={s.title}
                className="flex flex-col gap-2 rounded-2xl border border-white/20 bg-white/10 p-6 transition duration-300 hover:border-white/40 hover:bg-white/[.16] motion-safe:hover:-translate-y-1"
              >
                <h3 className="text-[17px] font-extrabold">{s.title}</h3>
                <p className="text-[15px] leading-relaxed text-[#DCE2FF]">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className="scroll-mt-24 px-6 py-20 sm:py-24">
        <div
          className="mx-auto grid max-w-6xl gap-10 rounded-[30px] px-8 py-12 sm:px-14 lg:grid-cols-2 lg:gap-14"
          style={{ background: "radial-gradient(ellipse at 15% 20%, rgba(90,59,240,.22), transparent 50%), radial-gradient(ellipse at 85% 80%, rgba(18,181,201,.24), transparent 50%), #F8F7FF" }}
        >
          <div className="flex flex-col gap-4">
            <Eyebrow>Book a demo</Eyebrow>
            <h2 className="text-3xl font-extrabold leading-tight tracking-[-0.03em] sm:text-[44px]">
              See Praxxt with your own program
            </h2>
            <p className="text-lg leading-relaxed" style={{ color: BODY }}>
              We onboard each program directly: your competencies, rotations and compliance requirements, set up
              with your coordinators. Tell us about your program and we&apos;ll take it from there.
            </p>
            <p className="text-[15px]" style={{ color: BODY }}>
              Prefer email?{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="font-bold underline" style={{ color: VIOLET }}>
                {CONTACT_EMAIL}
              </a>
            </p>
          </div>
          <div className="rounded-3xl bg-white p-6 sm:p-8" style={{ boxShadow: "0 12px 30px rgba(37,32,110,.08)" }}>
            <ContactForm />
          </div>
        </div>
      </section>

      <footer className="px-6 pb-9 pt-16 text-[#C9C7E3]" style={{ backgroundColor: INK }}>
        <div className="mx-auto flex max-w-6xl flex-col gap-12">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
            <div className="flex flex-col gap-4">
              <Link href="/" aria-label="Praxxt home" className="w-fit transition hover:opacity-80">
                <Wordmark size={28} tone="onDark" />
              </Link>
              <p className="max-w-xs leading-relaxed">The connected record for clinical education.</p>
              <div className="flex gap-3">
                {SOCIALS.map(({ label, Icon, href }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Praxxt on ${label}`}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition duration-200 hover:bg-white/25 motion-safe:hover:scale-110"
                  >
                    <Icon className="h-4 w-4" color="#FFFFFF" />
                  </a>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-3 text-[15px]">
              <p className="text-xs font-extrabold uppercase tracking-widest text-white">Platform</p>
              <a href="#platform" className="hover:text-white">Modules</a>
              <a href="#disciplines" className="hover:text-white">Disciplines</a>
              <a href="#security" className="hover:text-white">Security</a>
            </div>
            <div className="flex flex-col gap-3 text-[15px]">
              <p className="text-xs font-extrabold uppercase tracking-widest text-white">Resources</p>
              <Link href="/help" className="hover:text-white">Help center</Link>
              <Link href="/help/training-videos" className="hover:text-white">Training videos</Link>
              <Link href="/login" className="hover:text-white">Log in</Link>
            </div>
            <div className="flex flex-col gap-3 text-[15px]">
              <p className="text-xs font-extrabold uppercase tracking-widest text-white">Company</p>
              <a href="#contact" className="hover:text-white">Book a demo</a>
              <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-white">Contact</a>
            </div>
          </div>
          <div className="flex flex-col gap-2 border-t pt-6 text-sm sm:flex-row sm:justify-between" style={{ borderColor: "#2B2860" }}>
            <p>
              © {new Date().getFullYear()} Praxxt, a product of{" "}
              <span className="font-semibold text-white">Ikona Health and Research Consult</span>. All rights reserved.
            </p>
            <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-white">{CONTACT_EMAIL}</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
