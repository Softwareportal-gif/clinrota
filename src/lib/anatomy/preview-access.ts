// The Body Explorer is unpublished: it only appears when ANATOMY_PREVIEW is
// "true" and the signed-in user's email is listed in ANATOMY_PREVIEW_EMAILS
// (comma-separated). Everyone else gets a 404, as if it didn't exist.
export function isAnatomyPreviewEnabled(email: string | null | undefined): boolean {
  if (process.env.ANATOMY_PREVIEW !== "true") return false;
  const wanted = email?.trim().toLowerCase();
  if (!wanted) return false;
  const allowed = (process.env.ANATOMY_PREVIEW_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(wanted);
}
