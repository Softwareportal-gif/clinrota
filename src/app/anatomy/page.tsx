import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { allowedSystems, freeTesting, TRIAL_DAYS } from "@/lib/anatomy/access";
import { isAnatomyOpenTo } from "@/lib/anatomy/preview-access";
import { accessForUser } from "@/lib/anatomy/subscriptions";
import { Explorer } from "./explorer";
import { BRAND, MarketingFrame } from "./marketing";
import { logOutOfAnatomy } from "./account-actions";
import { startMyTrial } from "./plan-actions";

export const metadata: Metadata = { title: "Praxxt Anatomy" };

// Signed-in users only. Before launch (ANATOMY_PUBLIC unset) only the
// preview list may enter; everyone else gets a 404. After that, the plan
// decides: none yet → start a trial, ended → see plans, otherwise explore.
export default async function AnatomyPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/anatomy/login");
  if (!isAnatomyOpenTo(session.user.email)) notFound();

  const access = await accessForUser(session.user.id, session.user.role);
  if (access.level === "none") return <NoAccess ended={access.plan !== null} />;

  return (
    <Explorer
      modelBaseUrl="/api/anatomy/model/v1"
      allowedSystems={allowedSystems(access.level)}
      plan={access.plan ? { plan: access.plan, daysLeft: access.daysLeft } : null}
      freeTesting={freeTesting()}
      logOut={logOutOfAnatomy}
    />
  );
}

function NoAccess({ ended }: { ended: boolean }) {
  return (
    <MarketingFrame>
      <main className="mx-auto max-w-xl px-6 py-20 text-center">
        {ended ? (
          <>
            <h1 className="text-3xl font-extrabold tracking-[-0.02em]">Your Praxxt Anatomy access has ended</h1>
            <p className="mt-3 text-lg" style={{ color: BRAND.body }}>
              Choose a plan to keep exploring the body in 3D.
            </p>
            <Link href="/anatomy/plans" className="mt-8 inline-block rounded-full px-7 py-3.5 font-bold text-white" style={{ background: BRAND.gradient }}>
              See plans
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-extrabold tracking-[-0.02em]">Try Praxxt Anatomy free for {TRIAL_DAYS} days</h1>
            <p className="mt-3 text-lg" style={{ color: BRAND.body }}>
              Explore 3,000+ structures in 3D with study cards for each. No card needed.
            </p>
            <form action={startMyTrial}>
              <button type="submit" className="mt-8 cursor-pointer rounded-full px-7 py-3.5 font-bold text-white" style={{ background: BRAND.warm }}>
                Start my free trial
              </button>
            </form>
            <p className="mt-4 text-sm" style={{ color: BRAND.muted }}>
              <Link href="/anatomy/plans" className="underline">
                Compare plans
              </Link>
            </p>
          </>
        )}
      </main>
    </MarketingFrame>
  );
}
