import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Logo } from "@/components/logo";
import { Badge } from "@/components/badge";
import { TicketForm } from "./ticket-form";

const DEEP_TEAL = "#0A3F38";

const STATUS_LABELS = { OPEN: "Open", RESOLVED: "Resolved" } as const;
const STATUS_CLASSES = {
  OPEN: "bg-amber-100 text-amber-800",
  RESOLVED: "bg-green-100 text-green-800",
} as const;

// Open to any signed-in role — ticket creation isn't scoped to one
// section of the app, so this checks for a session directly rather than
// requireRole(single role).
export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string; description?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/help/tickets");

  const { subject, description } = await searchParams;

  const tickets = await prisma.supportTicket.findMany({
    where: { createdById: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-white">
      <header className="px-6 py-4" style={{ backgroundColor: DEEP_TEAL }}>
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link
            href="/"
            aria-label="ClinRota home"
            className="flex w-fit items-center gap-2.5 transition hover:opacity-80"
          >
            <Logo size={28} />
            <span className="text-base font-extrabold tracking-tight text-white">ClinRota</span>
          </Link>
          <Link href="/help" className="text-sm font-semibold text-white/80 hover:text-white">
            ← Back to help
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: DEEP_TEAL }}>
          Create a ticket
        </h1>
        <p className="mt-2 text-base text-gray-600">
          Tell us what&apos;s wrong and we&apos;ll reply by email.
        </p>

        <div className="mt-8">
          <TicketForm initialSubject={subject} initialDescription={description} />
        </div>

        <section className="mt-14">
          <h2 className="text-sm font-extrabold uppercase tracking-widest text-gray-500">
            My tickets
          </h2>
          {tickets.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">You haven&apos;t submitted any tickets yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-gray-200 rounded-md border border-gray-200 bg-white">
              {tickets.map((ticket) => (
                <li key={ticket.id} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{ticket.subject}</p>
                    <p className="text-xs text-gray-500">
                      Submitted {ticket.createdAt.toLocaleDateString()}
                    </p>
                  </div>
                  <Badge label={STATUS_LABELS[ticket.status]} className={STATUS_CLASSES[ticket.status]} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
