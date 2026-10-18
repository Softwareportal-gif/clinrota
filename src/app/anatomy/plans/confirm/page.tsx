import type { Metadata } from "next";
import Link from "next/link";
import { PLANS } from "@/lib/anatomy/access";
import { confirmPayment } from "@/lib/anatomy/subscriptions";
import { BRAND, MarketingFrame } from "../../marketing";

export const metadata: Metadata = { title: "Payment · Praxxt Anatomy" };

// Where Paystack sends the buyer back (?reference=… or ?trxref=…).
export default async function ConfirmPaymentPage({ searchParams }: { searchParams: Promise<{ reference?: string; trxref?: string }> }) {
  const params = await searchParams;
  const reference = params.reference ?? params.trxref ?? "";
  const result = reference ? await confirmPayment(reference).catch(() => null) : null;

  return (
    <MarketingFrame>
      <main className="mx-auto max-w-xl px-6 py-20 text-center">
        {result?.ok ? (
          <>
            <h1 className="text-3xl font-extrabold tracking-[-0.02em]">Thank you, you&apos;re all set</h1>
            <p className="mt-3 text-lg" style={{ color: BRAND.body }}>
              Your {result.plan in PLANS ? PLANS[result.plan as keyof typeof PLANS].name : ""} plan is active until{" "}
              {result.endsAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-extrabold tracking-[-0.02em]">We couldn&apos;t confirm your payment yet</h1>
            <p className="mt-3 text-lg" style={{ color: BRAND.body }}>
              If you completed the payment, it can take a minute to arrive; refresh this page shortly. Nothing has been charged
              twice. Still stuck? Email{" "}
              <a href="mailto:hello@praxxt.com" className="font-bold underline" style={{ color: BRAND.violet }}>
                hello@praxxt.com
              </a>
              {reference ? ` with reference ${reference}.` : "."}
            </p>
          </>
        )}
        <Link href="/anatomy" className="mt-8 inline-block rounded-full px-7 py-3.5 font-bold text-white" style={{ background: BRAND.gradient }}>
          Open Praxxt Anatomy
        </Link>
      </main>
    </MarketingFrame>
  );
}
