// Same "computed, not stored" pattern as compliance-status.ts, applied to a
// clinical site's affiliation agreement / MOU end date.
export type SiteContractStatus = "NO_CONTRACT" | "ACTIVE" | "EXPIRING_SOON" | "EXPIRED";

const SITE_EXPIRING_SOON_WINDOW_MS = 60 * 24 * 60 * 60 * 1000;

export function getSiteContractStatus(site: { mouEndDate: Date | null }): SiteContractStatus {
  if (!site.mouEndDate) return "NO_CONTRACT";
  const msUntilExpiry = site.mouEndDate.getTime() - Date.now();
  if (msUntilExpiry < 0) return "EXPIRED";
  if (msUntilExpiry <= SITE_EXPIRING_SOON_WINDOW_MS) return "EXPIRING_SOON";
  return "ACTIVE";
}

export function isSiteContractIssue(status: SiteContractStatus): boolean {
  return status === "EXPIRED" || status === "EXPIRING_SOON";
}

export const SITE_STATUS_LABELS: Record<SiteContractStatus, string> = {
  NO_CONTRACT: "No contract on file",
  ACTIVE: "Active",
  EXPIRING_SOON: "Expiring soon",
  EXPIRED: "Expired",
};

export const SITE_STATUS_BADGE_CLASSES: Record<SiteContractStatus, string> = {
  NO_CONTRACT: "bg-gray-100 text-gray-500",
  ACTIVE: "bg-green-100 text-green-700",
  EXPIRING_SOON: "bg-amber-100 text-amber-700",
  EXPIRED: "bg-red-100 text-red-700",
};
