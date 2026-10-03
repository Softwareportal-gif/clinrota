import Link from "next/link";
import { Logo } from "@/components/logo";
import { LoginIllustration } from "@/components/login-illustration";
import { LoginForm } from "./login-form";
import { LoginTips } from "./login-tips";

// Same palette as the public landing page (src/app/landing-page.tsx) —
// kept as local constants here rather than a shared module since neither
// page currently imports from the other and a two-file palette isn't
// worth a shared config yet.
const DEEP_TEAL = "#0A3F38";
const CORAL = "#E8734A";
const CREAM = "#F3EFE7";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  return (
    <main className="grid min-h-screen lg:grid-cols-[1fr_1.15fr]">
      {/* Brand panel — hidden below lg so a phone screen goes straight to
          the form; logo + headline still show above the form on mobile,
          just without the illustration and its extra scroll height. */}
      <div
        className="flex flex-col justify-between px-8 py-10 sm:px-12 lg:py-14"
        style={{ background: `linear-gradient(to bottom, ${CREAM}, #FFFFFF)` }}
      >
        <div>
          <Link
            href="/"
            aria-label="ClinRota home"
            className="flex w-fit items-center gap-2.5 transition hover:opacity-80"
          >
            <Logo size={32} />
            <span className="text-lg font-extrabold tracking-tight" style={{ color: DEEP_TEAL }}>
              ClinRota
            </span>
          </Link>

          <p className="mt-10 text-sm font-bold uppercase tracking-widest" style={{ color: CORAL }}>
            For clinical training programs
          </p>
          <h1
            className="mt-3 text-3xl font-extrabold leading-[1.1] tracking-tight sm:text-4xl"
            style={{ color: DEEP_TEAL }}
          >
            Every Rotation.
            <br />
            One Record.
          </h1>
          <p className="mt-4 max-w-sm text-base leading-relaxed text-gray-600">
            Every case, sign-off, and evaluation your program tracks, in one place your students
            and supervisors can actually use at the bedside.
          </p>
        </div>

        <div className="mx-auto mt-10 hidden w-full max-w-[400px] lg:block">
          <LoginIllustration className="w-full" />
          <div className="mt-8">
            <LoginTips />
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-white px-6 py-12 sm:px-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <p className="text-sm text-gray-500">Sign in to your clinical logbook</p>
          </div>

          <LoginForm callbackUrl={callbackUrl} />

          <div className="mt-8 space-y-3 border-t border-gray-100 pt-6 text-sm text-gray-500">
            <p>
              New here? Ask your program coordinator to add you — ClinRota accounts are set up by
              your program, not self-registered.
            </p>
            <p>
              Representing a school or hospital?{" "}
              <Link href="/#contact" className="font-semibold underline" style={{ color: CORAL }}>
                Request a demo →
              </Link>
            </p>
            <p>
              Trouble signing in?{" "}
              <Link href="/help#login-access" className="font-semibold underline" style={{ color: DEEP_TEAL }}>
                Visit our help page
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
