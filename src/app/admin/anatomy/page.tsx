import { requireRole } from "@/lib/require-role";
import { prisma } from "@/lib/prisma";
import { formatCedis, trialLimit } from "@/lib/anatomy/access";
import { isPaystackConfigured } from "@/lib/anatomy/paystack";
import { isAnatomyPublic, isAnatomySignupOpen } from "@/lib/anatomy/preview-access";
import { SetPlanForm } from "./set-plan-form";
import { TesterForm } from "./tester-form";

const date = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default async function AdminAnatomyPage() {
  await requireRole("SUPER_ADMIN");
  const now = new Date();
  const [subscriptions, payments, activeTrials, activePaid] = await Promise.all([
    prisma.anatomySubscription.findMany({
      orderBy: { updatedAt: "desc" },
      take: 200,
      include: { user: { select: { name: true, email: true, role: true } } },
    }),
    prisma.anatomyPayment.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { user: { select: { email: true } } },
    }),
    prisma.anatomySubscription.count({ where: { plan: "TRIAL", endsAt: { gt: now } } }),
    prisma.anatomySubscription.count({ where: { plan: { not: "TRIAL" }, endsAt: { gt: now } } }),
  ]);

  const settings = [
    { label: "Open to the public", value: isAnatomyPublic() ? "Yes" : "No (preview list only)" },
    { label: "Trial shows", value: trialLimit() === "skeletal" ? "Skeletal system only" : "The whole body (feedback mode)" },
    { label: "Online payments (Paystack)", value: isPaystackConfigured() ? "On" : "Off: Buy says “Contact us”" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Praxxt Anatomy</h1>
        <p className="mt-1 text-sm text-gray-600">Trials, plans and payments.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-600">Active trials</p>
          <p className="text-2xl font-bold">{activeTrials}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-600">Active paid plans</p>
          <p className="text-2xl font-bold">{activePaid}</p>
        </div>
      </div>

      <dl className="grid gap-2 rounded-xl border border-gray-200 bg-white p-4 text-sm sm:grid-cols-3">
        {settings.map((s) => (
          <div key={s.label}>
            <dt className="text-gray-600">{s.label}</dt>
            <dd className="font-semibold">{s.value}</dd>
          </div>
        ))}
      </dl>

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="font-semibold">Shared tester login</h2>
        <p className="mb-3 mt-1 text-sm text-gray-600">
          One login every tester can use, with full access. Pick an email and a new password used nowhere else, then
          share them with your testers. Public sign-up is {isAnatomySignupOpen() ? "open" : "paused"}.
        </p>
        <TesterForm />
        <p className="mt-2 text-xs text-gray-500">
          To stop testers later, set this login&apos;s plan below with Months = 0. Ten wrong passwords in 15 minutes
          lock the login for 15 minutes, so share the password exactly.
        </p>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="mb-3 font-semibold">Set a plan by hand</h2>
        <SetPlanForm />
        <p className="mt-2 text-xs text-gray-500">For Institution deals, extending testers or fixing a payment. Months = 0 ends access.</p>
      </section>

      <section className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <h2 className="px-4 pt-4 font-semibold">Subscriptions</h2>
        <table className="mt-2 w-full min-w-[640px] text-left text-sm">
          <thead className="text-gray-600">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Plan</th>
              <th className="px-4 py-2 font-medium">Ends</th>
              <th className="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {subscriptions.map((s) => (
              <tr key={s.id} className="border-t border-gray-100">
                <td className="px-4 py-2">{s.user.name}</td>
                <td className="px-4 py-2">{s.user.email}</td>
                <td className="px-4 py-2">{s.plan.charAt(0) + s.plan.slice(1).toLowerCase()}</td>
                <td className="px-4 py-2">{date(s.endsAt)}</td>
                <td className="px-4 py-2">{s.endsAt > now ? "Active" : "Ended"}</td>
              </tr>
            ))}
            {subscriptions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                  No sign-ups yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <h2 className="px-4 pt-4 font-semibold">Recent payments</h2>
        <table className="mt-2 w-full min-w-[640px] text-left text-sm">
          <thead className="text-gray-600">
            <tr>
              <th className="px-4 py-2 font-medium">When</th>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Plan</th>
              <th className="px-4 py-2 font-medium">Amount</th>
              <th className="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className="border-t border-gray-100">
                <td className="px-4 py-2">{date(p.createdAt)}</td>
                <td className="px-4 py-2">{p.user.email}</td>
                <td className="px-4 py-2">{p.plan.charAt(0) + p.plan.slice(1).toLowerCase()}</td>
                <td className="px-4 py-2">{formatCedis(p.amount)}</td>
                <td className="px-4 py-2">{p.status}</td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                  No payments yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
