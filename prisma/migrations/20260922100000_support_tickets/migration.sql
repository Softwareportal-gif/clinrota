-- Support tickets: a stored record per request (for a "My Tickets" status
-- view) plus an email to the admin address, sent from application code
-- via the existing Resend integration — not part of this migration.

CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'RESOLVED');

CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SupportTicket_createdById_idx" ON "SupportTicket"("createdById");
CREATE INDEX "SupportTicket_status_idx" ON "SupportTicket"("status");

ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
