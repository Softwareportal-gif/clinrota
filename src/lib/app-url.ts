// VERCEL_PROJECT_PRODUCTION_URL is injected automatically on Vercel (host
// only, no scheme), so email links work without hand-setting NEXTAUTH_URL.
export function appBaseUrl(): string {
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}
