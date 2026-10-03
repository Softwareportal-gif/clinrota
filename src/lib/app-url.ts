// RENDER_EXTERNAL_URL is injected automatically on Render web services, so a
// deploy works without hand-setting NEXTAUTH_URL to a URL that isn't known
// until the service exists.
export function appBaseUrl(): string {
  return (process.env.NEXTAUTH_URL ?? process.env.RENDER_EXTERNAL_URL ?? "http://localhost:3000").replace(/\/$/, "");
}
