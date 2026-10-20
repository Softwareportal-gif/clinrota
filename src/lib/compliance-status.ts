import type { ComplianceDocStatus } from "@/generated/prisma/client";

// A document with no upload at all isn't a DB row — "MISSING" only exists
// at this computed layer. "EXPIRED"/"EXPIRING_SOON" likewise overlay
// verificationStatus at read time (see the enum's schema comment) so they
// can never go stale without a background job.
export type EffectiveDocStatus =
  | "MISSING"
  | "PENDING_VERIFICATION"
  | "VERIFIED"
  | "REJECTED"
  | "EXPIRING_SOON"
  | "EXPIRED";

const EXPIRING_SOON_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export function getEffectiveDocStatus(
  doc: { verificationStatus: ComplianceDocStatus; expiryDate: Date | null } | null | undefined
): EffectiveDocStatus {
  if (!doc) return "MISSING";
  if (doc.expiryDate) {
    const msUntilExpiry = doc.expiryDate.getTime() - Date.now();
    if (msUntilExpiry < 0) return "EXPIRED";
    if (msUntilExpiry <= EXPIRING_SOON_WINDOW_MS) return "EXPIRING_SOON";
  }
  return doc.verificationStatus;
}

export function isCompliant(status: EffectiveDocStatus): boolean {
  return status === "VERIFIED";
}

export const DOC_STATUS_LABELS: Record<EffectiveDocStatus, string> = {
  MISSING: "Missing",
  PENDING_VERIFICATION: "Pending review",
  VERIFIED: "Verified",
  REJECTED: "Rejected",
  EXPIRING_SOON: "Expiring soon",
  EXPIRED: "Expired",
};

export const DOC_STATUS_BADGE_CLASSES: Record<EffectiveDocStatus, string> = {
  MISSING: "bg-gray-100 text-gray-500",
  PENDING_VERIFICATION: "bg-blue-100 text-blue-700",
  VERIFIED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  EXPIRING_SOON: "bg-amber-100 text-amber-700",
  EXPIRED: "bg-red-100 text-red-700",
};
