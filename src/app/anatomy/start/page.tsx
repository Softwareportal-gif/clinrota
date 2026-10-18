import type { Metadata } from "next";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAnatomyPublic } from "@/lib/anatomy/preview-access";
import { freeTesting, TRIAL_DAYS } from "@/lib/anatomy/access";
import { BRAND, MarketingFrame } from "../marketing";
import { SignUpForm } from "./sign-up-form";

export const metadata: Metadata = { title: "Start your free trial · Praxxt Anatomy" };

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
          <h2 className="text-2xl font-extrabold tracking-[-0.02em]">Create your account</h2>
          <p className="mb-6 mt-1 text-sm" style={{ color: BRAND.body }}>
            {free ? "It's free while we test it. Tell us what you think!" : `Your trial starts straight away and lasts ${TRIAL_DAYS} days.`}
          </p>
          <SignUpForm />
        </div>
      </main>
    </MarketingFrame>
  );
}
