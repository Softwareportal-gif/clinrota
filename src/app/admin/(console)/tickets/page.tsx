import { requireRole } from "@/lib/require-role";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "@/components/dashboard-header";
import { Badge } from "@/components/badge";
import { ResolveTicketButton } from "./resolve-ticket-button";
import { formatDate } from "@/lib/format-date";

const STATUS_LABELS = { OPEN: "Open", RESOLVED: "Resolved" } as const;
const STATUS_CLASSES = {
  OPEN: "bg-amber-100 text-amber-800",
  RESOLVED: "bg-green-100 text-green-800",
} as const;

export default async function AdminTicketsPage() {
  await requireRole("SUPER_ADMIN");

  const tickets = await prisma.supportTicket.findMany({
    include: { createdBy: true },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return (
    <main className="min-h-screen bg-gray-50">
      <DashboardHeader title="Support tickets" />
      <div className="mx-auto max-w-4xl px-6 py-8">
        {tickets.length === 0 ? (
          <p className="text-sm text-gray-500">No tickets yet.</p>
        ) : (
          <ul className="divide-y divide-gray-200 rounded-md border border-gray-200 bg-white">
            {tickets.map((ticket) => (
              <li key={ticket.id} className="flex items-start justify-between gap-4 px-4 py-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">{ticket.subject}</p>
                    <Badge label={STATUS_LABELS[ticket.status]} className={STATUS_CLASSES[ticket.status]} />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {ticket.createdBy.name} ({ticket.createdBy.role}) ·{" "}
                    <a href={`mailto:${ticket.createdBy.email}`} className="hover:underline">
                      {ticket.createdBy.email}
                    </a>{" "}
                    · submitted {formatDate(ticket.createdAt)}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{ticket.description}</p>
                </div>
                {ticket.status === "OPEN" && <ResolveTicketButton ticketId={ticket.id} />}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
