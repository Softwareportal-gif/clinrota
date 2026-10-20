import Link from "next/link";
import { requireRole } from "@/lib/require-role";
import { getCoordinatorProfileByUserId } from "@/lib/coordinator";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "@/components/dashboard-header";
import { formatDate } from "@/lib/format-date";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Documents to review" };

export default async function ComplianceQueuePage() {
  const session = await requireRole("COORDINATOR");
  const coordinatorProfile = await getCoordinatorProfileByUserId(session.user.id);

  const pending = await prisma.complianceDocument.findMany({
    where: {
      verificationStatus: "PENDING_VERIFICATION",
      student: { programId: coordinatorProfile.programId },
    },
    include: { student: { include: { user: true } }, requiredDocumentType: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <main className="min-h-screen bg-gray-50">
      <DashboardHeader back={{ href: "/coordinator/compliance", label: "Compliance" }} title="Pending compliance review" />
      <div className="mx-auto max-w-3xl px-6 py-8">
        <p className="mb-4 text-sm text-gray-500">
          {pending.length} document{pending.length === 1 ? "" : "s"} awaiting review
        </p>

        {pending.length === 0 ? (
          <p className="text-sm text-gray-500">Nothing pending right now.</p>
        ) : (
          <ul className="divide-y divide-gray-200 rounded-md border border-gray-200 bg-white">
            {pending.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {doc.requiredDocumentType.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    <Link href={`/coordinator/students/${doc.studentId}`} className="hover:underline">
                      {doc.student.user.name}
                    </Link>{" "}
                    · uploaded {formatDate(doc.createdAt)}
                  </p>
                </div>
                <Link
                  href={`/coordinator/compliance/review/${doc.id}`}
                  className="shrink-0 text-sm font-medium text-blue-600 hover:underline"
                >
                  Review →
                </Link>
              </li>
            ))}
          </ul>
        )}

      </div>
    </main>
  );
}
