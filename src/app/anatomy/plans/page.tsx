import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { formatCedis, PLANS, TRIAL_DAYS } from "@/lib/anatomy/access";
import { isPaystackConfigured } from "@/lib/anatomy/paystack";
import { isAnatomyPublic } from "@/lib/anatomy/preview-access";
import { BRAND, MarketingFrame } from "../marketing";
import { buyPlan } from "../plan-actions";

export const metadata: Metadata = { title: "Plans · Praxxt Anatomy" };

const CONTACT_EMAIL = "hello@praxxt.com";

type Column = "STUDENT" | "PROFESSIONAL" | "INSTITUTION";
const COLUMNS: Column[] = ["STUDENT", "PROFESSIONAL", "INSTITUTION"];

// What each plan includes. Keep this true to what the product does today.
const FEATURES: { label: string; in: Column[] }[] = [
  { label: "3D atlas: 3,000+ structures, 11 body systems", in: ["STUDENT", "PROFESSIONAL", "INSTITUTION"] },
  { label: "Study cards: quick facts, anatomy, function, clinical", in: ["STUDENT", "PROFESSIONAL", "INSTITUTION"] },
  { label: "Search by everyday or medical name", in: ["STUDENT", "PROFESSIONAL", "INSTITUTION"] },
  { label: "Peel layers; isolate, hide and fade any structure", in: ["STUDENT", "PROFESSIONAL", "INSTITUTION"] },
  { label: "Phones and laptops", in: ["STUDENT", "PROFESSIONAL", "INSTITUTION"] },
  { label: "Use in classroom and ward teaching", in: ["PROFESSIONAL", "INSTITUTION"] },
  { label: "Use in patient education", in: ["PROFESSIONAL", "INSTITUTION"] },
  { label: "Seats for whole cohorts", in: ["INSTITUTION"] },
  { label: "Managed with your programme in Praxxt", in: ["INSTITUTION"] },
  { label: "Onboarding and support from our team", in: ["INSTITUTION"] },
];

const ERRORS: Record<string, string> = {
  busy: "Too many checkout attempts. Please wait a few minutes and try again.",
  checkout: "We couldn't open the payment page just now. Please try again, or contact us.",
};

function Tick() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#12A4B5" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-label="Included">
      <path d="M5 12l5 5 9-10" />
    </svg>
  );
}

export default async function PlansPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (!isAnatomyPublic()) notFound();
  const { error } = await searchParams;
  const session = await auth();
  const canPayOnline = isPaystackConfigured();

  function action(plan: Column) {
    if (plan === "INSTITUTION") {
      return (
        <a
          href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Praxxt Anatomy for our institution")}`}
          className="inline-block rounded-full border px-5 py-2.5 text-sm font-bold transition hover:border-[#5A3BF0] hover:text-[#5A3BF0]"
          style={{ borderColor: "#DCD8F5" }}
        >
          Contact sales
        </a>
      );
    }
    if (!canPayOnline) {
      return (
        <a
          href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`Praxxt Anatomy ${PLANS[plan].name} plan`)}`}
          className="inline-block rounded-full px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110"
          style={{ background: BRAND.gradient }}
        >
          Contact us to buy
        </a>
      );
    }
    return (
      <form action={buyPlan}>
        <input type="hidden" name="plan" value={plan} />
        <button
          type="submit"
          className="cursor-pointer rounded-full px-6 py-2.5 text-sm font-bold text-white transition hover:brightness-110"
          style={{ background: BRAND.gradient }}
        >
          Buy now
        </button>
      </form>
    );
  }

  return (
    <MarketingFrame>
      <main className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 text-center">
          <h1 className="text-4xl font-extrabold tracking-[-0.03em] sm:text-5xl">Choose your plan</h1>
          <p className="text-lg" style={{ color: BRAND.body }}>
            Start with a free {TRIAL_DAYS}-day trial, then pick the plan that fits. Prices are per year, in Ghana cedis.
          </p>
          {!session?.user && (
            <Link href="/anatomy/start" className="mt-2 rounded-full px-7 py-3.5 font-bold text-white transition hover:brightness-110" style={{ background: BRAND.warm }}>
              Start your free trial →
            </Link>
          )}
          {error && ERRORS[error] && (
            <p role="alert" className="mt-2 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">
              {ERRORS[error]}
            </p>
          )}
        </div>

        <div className="mt-12 overflow-x-auto">
          <table className="w-full min-w-[640px] border-separate border-spacing-0 text-left">
            <thead>
              <tr>
                <th className="w-[40%]" scope="col">
                  <span className="sr-only">Feature</span>
                </th>
                {COLUMNS.map((plan) => (
                  <th key={plan} scope="col" className="px-3 pb-6 text-center align-bottom">
                    <p className="text-lg font-extrabold">{PLANS[plan].name}</p>
                    <p className="mx-auto mt-1 max-w-[220px] text-xs font-medium" style={{ color: BRAND.muted }}>
                      {PLANS[plan].audience}
                    </p>
                    <p className="mt-3 text-3xl font-extrabold tracking-[-0.02em]">
                      {PLANS[plan].amount ? formatCedis(PLANS[plan].amount!) : "Custom"}
                      {PLANS[plan].amount && (
                        <span className="text-sm font-semibold" style={{ color: BRAND.muted }}>
                          {" "}
                          /year
                        </span>
                      )}
                    </p>
                    <div className="mt-4">{action(plan)}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEATURES.map((f) => (
                <tr key={f.label}>
                  <th scope="row" className="border-t py-4 pr-4 text-[15px] font-semibold" style={{ borderColor: BRAND.line }}>
                    {f.label}
                  </th>
                  {COLUMNS.map((plan) => (
                    <td key={plan} className="border-t py-4 text-center" style={{ borderColor: BRAND.line }}>
                      {f.in.includes(plan) ? (
                        <span className="inline-flex justify-center">
                          <Tick />
                        </span>
                      ) : (
                        <span aria-label="Not included" style={{ color: "#C9C7DC" }}>
                          –
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-10 text-center text-sm" style={{ color: BRAND.muted }}>
          {canPayOnline ? "Pay securely by card or mobile money with Paystack. " : ""}Questions?{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-bold underline" style={{ color: BRAND.violet }}>
            {CONTACT_EMAIL}
          </a>
        </p>
      </main>
    </MarketingFrame>
  );
}
