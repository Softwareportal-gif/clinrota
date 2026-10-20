import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAnatomyPublic, isAnatomySignupOpen } from "@/lib/anatomy/preview-access";
import { BRAND, MarketingFrame } from "../marketing";
import { AnatomyLoginForm } from "./anatomy-login-form";

export const metadata: Metadata = { title: "Log in · Praxxt Anatomy" };
// Depends on the session and launch settings, so never pre-rendered.
export const dynamic = "force-dynamic";

// Praxxt Anatomy's own login, separate from the clinical platform's /login:
// the two are sold separately, so an Anatomy customer never lands in the
// clinical portal.
export default async function AnatomyLoginPage() {
  if (!isAnatomyPublic()) notFound();
  const session = await auth();
  if (session?.user) redirect("/anatomy");

  return (
    <MarketingFrame>
      <main className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-14 lg:grid-cols-2 lg:py-20">
        <div className="flex flex-col gap-5">
          <span
            className="inline-flex w-fit items-center gap-2 rounded-full border bg-white px-4 py-1.5 text-[13px] font-bold"
            style={{ borderColor: "#FBD5E0", color: "#C2295A" }}
          >
            Praxxt Anatomy
          </span>
          <h1 className="text-4xl font-extrabold leading-tight tracking-[-0.03em] sm:text-5xl">Welcome back to the body in 3D</h1>
          <p className="text-lg leading-relaxed" style={{ color: BRAND.body }}>
            Log in to keep exploring 3,000+ structures, with a study card for each.
          </p>
          <div className="mt-2 hidden overflow-hidden rounded-3xl shadow-[0_20px_50px_rgba(37,32,110,.14)] lg:block" style={{ backgroundColor: "#EEF0F5" }}>
            <Image
              src="/images/anatomy/anatomy-chest.webp"
              alt="Praxxt Anatomy showing the rib cage and blood vessels"
              width={960}
              height={920}
              className="h-64 w-full object-cover"
            />
          </div>
        </div>
        <div className="rounded-3xl bg-white p-6 shadow-[0_12px_40px_rgba(37,32,110,.10)] sm:p-8" style={{ border: `1px solid ${BRAND.line}` }}>
          <h2 className="text-2xl font-extrabold tracking-[-0.02em]">Log in to Praxxt Anatomy</h2>
          <p className="mb-6 mt-1 text-sm" style={{ color: BRAND.body }}>
            Use the email and password for your Praxxt Anatomy account.
          </p>
          <AnatomyLoginForm />
          <div className="mt-6 space-y-2 border-t pt-5 text-center text-sm" style={{ borderColor: BRAND.line, color: BRAND.body }}>
            {isAnatomySignupOpen() ? (
              <p>
                New to Praxxt Anatomy?{" "}
                <Link href="/anatomy/start" className="font-bold underline" style={{ color: BRAND.violet }}>
                  Create a free account
                </Link>
              </p>
            ) : (
              <p>Testing for us? Use the tester login you were given.</p>
            )}
            <p>
              Forgot your password?{" "}
              <a href="mailto:hello@praxxt.com?subject=Praxxt%20Anatomy%20password" className="font-bold underline" style={{ color: BRAND.violet }}>
                Contact us
              </a>
            </p>
          </div>
        </div>
      </main>
    </MarketingFrame>
  );
}
