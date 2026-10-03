import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ROLE_HOME } from "@/lib/role-routes";
import { LandingPage } from "./landing-page";

// `/` is the public marketing page — logged-in visitors skip straight to
// their dashboard (proxy.ts already does this before this ever renders;
// this is just the safety-net fallback), everyone else sees the pitch.
// There's no self-serve path here on purpose — the "Login" link in the
// nav is for existing users, not a "Sign up" for new ones.
export default async function Home() {
  const session = await auth();
  if (session?.user) {
    redirect(ROLE_HOME[session.user.role]);
  }
  return <LandingPage />;
}
