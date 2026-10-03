import { requireRole } from "@/lib/require-role";
import { getStudentProfileByUserId } from "@/lib/student";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/badge";
import { getEffectiveDocStatus, DOC_STATUS_LABELS, DOC_STATUS_BADGE_CLASSES } from "@/lib/compliance-status";
import { UploadForm } from "./upload-form";
import { DARK_GREEN, TEXT_SECONDARY, BORDER } from "../dashboard-sections/colors";

export default async function StudentCompliancePage() {
  const session = await requireRole("STUDENT");
  const studentProfile = await getStudentProfileByUserId(session.user.id);

  const [docTypes, documents] = await Promise.all([
    prisma.requiredDocumentType.findMany({
      where: { programId: studentProfile.programId, isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.complianceDocument.findMany({
      where: { studentId: studentProfile.id },
    }),
  ]);
  const docByType = new Map(documents.map((d) => [d.requiredDocumentTypeId, d]));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold" style={{ color: DARK_GREEN }}>Required Documents</h1>
        <p className="mt-1 text-sm" style={{ color: TEXT_SECONDARY }}>
          Upload and track the compliance documents your program requires.
        </p>
      </div>
      <div className="space-y-4">
        {docTypes.length === 0 ? (
          <p className="text-sm" style={{ color: TEXT_SECONDARY }}>No compliance documents are required yet.</p>
        ) : (
          docTypes.map((type) => {
            const doc = docByType.get(type.id);
            const status = getEffectiveDocStatus(doc);
            return (
              <div key={type.id} className="rounded-xl bg-white p-4" style={{ border: `1px solid ${BORDER}` }}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium" style={{ color: "#1E2A27" }}>{type.name}</p>
                  <Badge label={DOC_STATUS_LABELS[status]} className={DOC_STATUS_BADGE_CLASSES[status]} />
                </div>
                {doc && (
                  <div className="mt-2 space-y-1 text-xs" style={{ color: TEXT_SECONDARY }}>
                    <p>
                      <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                        View uploaded file
                      </a>
                      {doc.expiryDate && ` · expires ${new Date(doc.expiryDate).toLocaleDateString()}`}
                    </p>
                    {doc.verificationStatus === "REJECTED" && doc.rejectionReason && (
                      <p className="text-red-600">Rejected: {doc.rejectionReason}</p>
                    )}
                  </div>
                )}
                <UploadForm requiredDocumentTypeId={type.id} buttonLabel={doc ? "Upload new" : "Upload"} />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
