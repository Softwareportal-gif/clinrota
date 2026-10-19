import type { Metadata } from "next";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import Link from "next/link";
import { isAnatomyPublic, isAnatomySignupOpen } from "@/lib/anatomy/preview-access";
import { freeTesting, TRIAL_DAYS } from "@/lib/anatomy/access";
import { BRAND, MarketingFrame } from "../marketing";
import { SignUpForm } from "./sign-up-form";

export const metadata: Metadata = { title: "Start your free trial · Praxxt Anatomy" };
// Depends on the session and launch settings, so never pre-rendered.
export const dynamic = "force-dynamic";

const POINTS = [
  "3,000+ structures across 11 body systems, in 3D",
  "Study cards with quick facts, function and clinical notes",
  "Search by everyday or medical name",
  "Works on your phone and laptop",
];

export default async function StartTrialPage() {
  if (!isAnatomyPublic()) notFound();
  const session = await auth();
  if (session?.user) redirect("/anatomy");
  const free = freeTesting();

  return (
    <MarketingFrame>
      <main className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-14 lg:grid-cols-2 lg:py-20">
        <div className="flex flex-col gap-5">
          <span
            className="inline-flex w-fit items-center gap-2 rounded-full border bg-white px-4 py-1.5 text-[13px] font-bold"
            style={{ borderColor: "#FBD5E0", color: "#C2295A" }}
          >
            {free ? "Free while we test · no card needed" : `${TRIAL_DAYS}-day free trial · no card needed`}
          </span>
          <h1 className="text-4xl font-extrabold leading-tight tracking-[-0.03em] sm:text-5xl">Explore the human body in 3D</h1>
          <p className="text-lg leading-relaxed" style={{ color: BRAND.body }}>
            Praxxt Anatomy is an interactive anatomy atlas for health-profession students and educators.
          </p>
          <ul className="flex flex-col gap-2.5">
            {POINTS.map((p) => (
              <li key={p} className="flex items-start gap-3">
                <span aria-hidden className="mt-1 h-4 w-4 shrink-0 rounded-full" style={{ background: BRAND.warm }} />
                {p}
              </li>
            ))}
          </ul>
          <div className="mt-2 hidden overflow-hidden rounded-3xl shadow-[0_20px_50px_rgba(37,32,110,.14)] lg:block" style={{ backgroundColor: "#EEF0F5" }}>
            <Image src="/images/anatomy/anatomy-chest.webp" alt="Praxxt Anatomy showing the rib cage and blood vessels" width={960} height={920} className="h-64 w-full object-cover" />
          </div>
        </div>
        <div className="rounded-3xl bg-white p-6 shadow-[0_12px_40px_rgba(37,32,110,.10)] sm:p-8" style={{ border: `1px solid ${BRAND.line}` }}>
          {isAnatomySignupOpen() ? (
            <>
              <h2 className="text-2xl font-extrabold tracking-[-0.02em]">Create your account</h2>
              <p className="mb-6 mt-1 text-sm" style={{ color: BRAND.body }}>
                {free ? "It's free while we test it. Tell us what you think!" : `Your trial starts straight away and lasts ${TRIAL_DAYS} days.`}
              </p>
              <SignUpForm />
            </>
          ) : (
            <>
              <h2 className="text-2xl font-extrabold tracking-[-0.02em]">Sign-ups are paused while we test</h2>
              <p className="mb-6 mt-2 leading-relaxed" style={{ color: BRAND.body }}>
                Testing Praxxt Anatomy for us? Log in with the tester email and password you were given.
              </p>
              <Link
                href="/login?callbackUrl=/anatomy"
                className="block w-full rounded-full px-6 py-3.5 text-center text-base font-bold text-white transition hover:brightness-110"
                style={{ background: BRAND.warm }}
              >
                Log in to Praxxt Anatomy
              </Link>
              <p className="mt-4 text-center text-sm" style={{ color: BRAND.body }}>
                Want to try it?{" "}
                <a href="mailto:hello@praxxt.com?subject=Praxxt%20Anatomy%20tester%20access" className="font-bold underline" style={{ color: BRAND.violet }}>
                  Ask us for access
                </a>
              </p>
            </>
          )}
        </div>
      </main>
    </MarketingFrame>
  );
}
