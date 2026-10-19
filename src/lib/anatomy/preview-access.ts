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

// Once launched (ANATOMY_PUBLIC="true"), every signed-in user may open
// Praxxt Anatomy, subject to their plan; before that, only the preview list.
export function isAnatomyOpenTo(email: string | null | undefined): boolean {
  return process.env.ANATOMY_PUBLIC === "true" || isAnatomyPreviewEnabled(email);
}

export function isAnatomyPublic(): boolean {
  return process.env.ANATOMY_PUBLIC === "true";
}

// Public sign-up can be frozen (ANATOMY_SIGNUP="closed"), e.g. while testers
// share one account an admin made; existing accounts still log in as usual.
export function isAnatomySignupOpen(): boolean {
  return process.env.ANATOMY_SIGNUP !== "closed";
}
