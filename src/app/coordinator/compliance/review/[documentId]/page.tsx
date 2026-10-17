import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole } from "@/lib/require-role";
import { getCoordinatorProfileByUserId } from "@/lib/coordinator";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "@/components/dashboard-header";
import { ReviewDocForm } from "./review-doc-form";

export default async function ReviewDocumentPage({
  params,
}: {
  params: Promise<{ documentId: string }>;
}) {
  const { documentId } = await params;
  const session = await requireRole("COORDINATOR");
  const coordinatorProfile = await getCoordinatorProfileByUserId(session.user.id);

  const doc = await prisma.complianceDocument.findUnique({
    where: { id: documentId },
    include: { student: { include: { user: true } }, requiredDocumentType: true },
  });

  if (
    !doc ||
    doc.student.programId !== coordinatorProfile.programId ||
    doc.verificationStatus !== "PENDING_VERIFICATION"
  ) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <DashboardHeader back={{ href: "/coordinator/compliance/queue", label: "Review queue" }} title="Review document" />
      <div className="mx-auto max-w-2xl space-y-6 px-6 py-8">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{doc.requiredDocumentType.name}</h2>
          <p className="text-sm text-gray-500">
            <Link href={`/coordinator/students/${doc.studentId}`} className="hover:underline">
              {doc.student.user.name}
            </Link>
          </p>
        </div>

        <dl className="space-y-2 rounded-md border border-gray-200 bg-white p-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-600">File</dt>
            <dd>
              <a
                href={doc.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-blue-600 hover:underline"
              >
                View file
              </a>
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600">Issue date</dt>
            <dd className="text-gray-900">
              {doc.issueDate ? new Date(doc.issueDate).toLocaleDateString() : "—"}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600">Expiry date</dt>
            <dd className="text-gray-900">
              {doc.expiryDate ? new Date(doc.expiryDate).toLocaleDateString() : "—"}
            </dd>
          </div>
        </dl>

        <ReviewDocForm documentId={doc.id} />

      </div>
    </main>
  );
}
