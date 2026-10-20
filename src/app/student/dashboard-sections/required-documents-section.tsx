import Link from "next/link";
import { DOC_STATUS_LABELS, type EffectiveDocStatus } from "@/lib/compliance-status";
import { INK, ACCENT, TEXT_SECONDARY, STATUS_GREEN, STATUS_AMBER, STATUS_RED, BORDER } from "./colors";

export type DocumentRow = {
  requiredDocumentTypeId: string;
  name: string;
  status: EffectiveDocStatus;
  expiryDate: Date | null;
  fileUrl: string | null;
  rejectionReason: string | null;
};

const DOT_COLOR: Record<EffectiveDocStatus, string> = {
  MISSING: STATUS_RED,
  REJECTED: STATUS_RED,
  EXPIRED: STATUS_RED,
  EXPIRING_SOON: STATUS_AMBER,
  PENDING_VERIFICATION: STATUS_AMBER,
  VERIFIED: STATUS_GREEN,
};

const LABEL_STYLE: Record<EffectiveDocStatus, { color: string; bold: boolean }> = {
  MISSING: { color: "#B23B2E", bold: true },
  REJECTED: { color: "#B23B2E", bold: true },
  EXPIRED: { color: "#B23B2E", bold: true },
  EXPIRING_SOON: { color: "#92620A", bold: false },
  PENDING_VERIFICATION: { color: "#92620A", bold: false },
  VERIFIED: { color: TEXT_SECONDARY, bold: false },
};

export function RequiredDocumentsSection({ documents }: { documents: DocumentRow[] }) {
  return (
    <section className="rounded-2xl bg-white p-6" style={{ border: `1px solid ${BORDER}` }}>
      <h2 className="text-base font-bold" style={{ color: INK }}>
        Required Documents
      </h2>

      {documents.length === 0 ? (
        <p className="mt-3 text-sm" style={{ color: TEXT_SECONDARY }}>
          No compliance documents are required yet.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {documents.map((doc) => {
            const labelStyle = LABEL_STYLE[doc.status];
            return (
              <div key={doc.requiredDocumentTypeId} className="flex items-center gap-2.5">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: DOT_COLOR[doc.status] }}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate text-sm" style={{ color: "#17153B" }}>
                  {doc.name}
                </span>
                <span
                  className="shrink-0 text-xs"
                  style={{ color: labelStyle.color, fontWeight: labelStyle.bold ? 700 : 400 }}
                >
                  {DOC_STATUS_LABELS[doc.status]}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <Link href="/student/compliance" className="mt-4 inline-block text-xs font-semibold" style={{ color: ACCENT }}>
        View all documents →
      </Link>
    </section>
  );
}
