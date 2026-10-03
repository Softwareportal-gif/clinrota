import Link from "next/link";
import { requireRole } from "@/lib/require-role";
import { getCoordinatorProfileByUserId } from "@/lib/coordinator";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "@/components/dashboard-header";
import { Badge } from "@/components/badge";
import {
  getEffectiveDocStatus,
  isCompliant,
  DOC_STATUS_LABELS,
  DOC_STATUS_BADGE_CLASSES,
} from "@/lib/compliance-status";

export default async function ComplianceOverviewPage() {
  const session = await requireRole("COORDINATOR");
  const coordinatorProfile = await getCoordinatorProfileByUserId(session.user.id);

  const [students, docTypes, pendingCount] = await Promise.all([
    prisma.studentProfile.findMany({
      where: { programId: coordinatorProfile.programId },
      include: { user: true },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.requiredDocumentType.findMany({
      where: { programId: coordinatorProfile.programId, isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.complianceDocument.count({
      where: {
        verificationStatus: "PENDING_VERIFICATION",
        student: { programId: coordinatorProfile.programId },
      },
    }),
  ]);

  const documents = await prisma.complianceDocument.findMany({
    where: { student: { programId: coordinatorProfile.programId } },
  });
  const docByStudentAndType = new Map(
    documents.map((d) => [`${d.studentId}:${d.requiredDocumentTypeId}`, d])
  );

  return (
    <main className="min-h-screen bg-gray-50">
      <DashboardHeader title="Compliance overview" userName={session.user.name ?? ""} />
      <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-500">Program: {coordinatorProfile.program.name}</p>
          <div className="flex gap-3">
            <Link
              href="/coordinator/compliance/queue"
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
            >
              Pending review ({pendingCount})
            </Link>
            <Link
              href="/coordinator/document-types"
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
            >
              Manage document types
            </Link>
          </div>
        </div>

        {docTypes.length === 0 ? (
          <p className="text-sm text-gray-500">
            No required document types configured yet. Add some under &quot;Manage document
            types&quot;.
          </p>
        ) : students.length === 0 ? (
          <p className="text-sm text-gray-500">No students in this program yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">Student</th>
                  {docTypes.map((type) => (
                    <th key={type.id} className="px-4 py-2 text-left font-medium text-gray-700">
                      {type.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {students.map((student) => {
                  const hasIssue = docTypes.some((type) => {
                    const doc = docByStudentAndType.get(`${student.id}:${type.id}`);
                    return !isCompliant(getEffectiveDocStatus(doc));
                  });
                  return (
                    <tr key={student.id} className={hasIssue ? "bg-red-50/40" : undefined}>
                      <td className="whitespace-nowrap px-4 py-2 font-medium text-gray-900">
                        <Link href={`/coordinator/students/${student.id}`} className="hover:underline">
                          {student.user.name}
                        </Link>
                      </td>
                      {docTypes.map((type) => {
                        const doc = docByStudentAndType.get(`${student.id}:${type.id}`);
                        const status = getEffectiveDocStatus(doc);
                        return (
                          <td key={type.id} className="whitespace-nowrap px-4 py-2">
                            <Badge
                              label={DOC_STATUS_LABELS[status]}
                              className={DOC_STATUS_BADGE_CLASSES[status]}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
