import Image from "next/image";
import Link from "next/link";
import { formatCedis, PLANS } from "@/lib/anatomy/access";

const INK = "#17153B";
const BODY = "#4A4867";
const SERIF = 'Georgia, "Noto Serif", "Times New Roman", serif';

// Praxxt sells two products, each its own way: Logbook (the three modules)
// to schools, as one yearly subscription agreed with us; Anatomy to
// individuals, with self-serve sign-up and plans (src/app/anatomy/plans).
// Each card says how it's bought and where its users sign in.
type Product = {
  label: string;
  name: string;
  body: string;
  pricing: { title: string; lines: string[] };
  primary: { label: string; href: string };
  secondary?: { label: string; href: string };
  signIn: { prompt: string; href: string };
  background: string;
  accent: string;
  visual: React.ReactNode;
};

function Check({ color }: { color: string }) {
  return (
    <span aria-hidden="true" className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: color }}>
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12l5 5 9-10" />
      </svg>
    </span>
  );
}

const PRODUCTS: Product[] = [
  {
    label: "For schools & training programmes",
    name: "Logbook",
    body: "Clinical logbook, rotations and placements, and compliance: the three modules above, for your whole programme.",
    pricing: {
      title: "How it's bought",
      lines: ["One yearly subscription per school, priced per student", "All three modules included", "We set up your cohorts, sites and framework with you"],
    },
    primary: { label: "Book a demo", href: "#contact" },
    signIn: { prompt: "Your school already uses Praxxt?", href: "/login" },
    background: "#FDE8F0",
    accent: "#D9246B",
    visual: (
      <div className="-mb-8 flex items-end justify-end sm:-mb-12">
        <Image src="/images/illustrations/placements.svg" alt="" width={850} height={1200} className="h-[220px] w-auto" />
        <Image src="/images/illustrations/logbook.svg" alt="" width={850} height={1200} className="-ml-16 h-[200px] w-auto" />
      </div>
    ),
  },
  {
    label: "New · For students & professionals",
    name: "Anatomy",
    body: "Explore 3,000+ structures in 3D, from skin to bone, on a phone or a laptop.",
    pricing: {
      title: "How it's bought",
      lines: [
        `Student ${formatCedis(PLANS.STUDENT.amount!)} a year · Professional ${formatCedis(PLANS.PROFESSIONAL.amount!)} a year`,
        "Institution plans for whole cohorts",
        "Free for everyone while we test it",
      ],
    },
    primary: { label: "Try it free", href: "/anatomy/start" },
    secondary: { label: "See plans", href: "/anatomy/plans" },
    signIn: { prompt: "Already have an account?", href: "/anatomy/login" },
    background: "#E6EEFF",
    accent: "#2563EB",
    visual: (
      <div className="h-[220px] w-[160px] rotate-[2deg] overflow-hidden rounded-[22px] border-4 border-white shadow-[0_18px_40px_rgba(37,32,110,.2)]" style={{ backgroundColor: "#EEF0F5" }}>
        <Image src="/images/anatomy/anatomy-muscles.webp" alt="" width={640} height={1212} sizes="160px" className="h-full w-full object-cover object-top" />
      </div>
    ),
  },
];

function CardLink({ href, className, style, children }: { href: string; className: string; style?: React.CSSProperties; children: React.ReactNode }) {
  return href.startsWith("#") ? (
    <a href={href} className={className} style={style}>
      {children}
    </a>
  ) : (
    <Link href={href} className={className} style={style}>
      {children}
    </Link>
  );
}

// The two Praxxt products side by side, each with its own way to buy and sign in.
export function ProductsShowcase() {
  return (
    <div className="mx-auto mt-12 grid max-w-6xl gap-6 px-6 lg:grid-cols-2">
      {PRODUCTS.map((p) => (
        <article key={p.name} className="flex flex-col overflow-hidden rounded-[32px] p-8 sm:p-12" style={{ backgroundColor: p.background, color: INK }}>
          <p className="text-sm font-bold uppercase tracking-[0.08em]" style={{ color: BODY }}>
            {p.label}
          </p>
          <h3 className="mt-4 text-[40px] font-extrabold leading-none tracking-[-0.03em] sm:text-[56px]">
            Praxxt{" "}
            <span className="font-bold" style={{ fontFamily: SERIF, color: p.accent, letterSpacing: "-0.02em" }}>
              {p.name}
            </span>
          </h3>
          <p className="mt-6 max-w-[420px] text-lg leading-relaxed">{p.body}</p>

          <div className="mt-6 rounded-2xl bg-white/70 p-5">
            <p className="text-xs font-extrabold uppercase tracking-[0.1em]" style={{ color: p.accent }}>
              {p.pricing.title}
            </p>
            <ul className="mt-3 flex flex-col gap-2">
              {p.pricing.lines.map((line) => (
                <li key={line} className="flex items-start gap-2.5 text-[15px] font-semibold leading-snug">
                  <Check color={p.accent} />
                  {line}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <CardLink href={p.primary.href} className="rounded-full px-7 py-3 text-base font-bold text-white transition hover:brightness-110" style={{ backgroundColor: p.accent }}>
              {p.primary.label}
            </CardLink>
            {p.secondary && (
              <CardLink
                href={p.secondary.href}
                className="rounded-full border-2 bg-white/70 px-7 py-3 text-base font-bold transition hover:bg-white"
                style={{ borderColor: p.accent }}
              >
                {p.secondary.label}
              </CardLink>
            )}
          </div>
          <p className="mt-4 text-[15px]" style={{ color: BODY }}>
            {p.signIn.prompt}{" "}
            <Link href={p.signIn.href} className="font-bold underline" style={{ color: p.accent }}>
              Log in
            </Link>
          </p>

          <div className="mt-auto flex justify-end pt-8">{p.visual}</div>
        </article>
      ))}
    </div>
  );
}
