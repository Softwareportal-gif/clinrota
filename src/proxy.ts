import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { ROLE_HOME, isPublicAnatomyPage, isPublicAuthPage, isSharedPath, loginPathFor } from "@/lib/role-routes";

// Next.js 16 renamed `middleware.ts` to `proxy.ts` (the exported function
// keeps working as a default export either way). This is the coarse,
// first line of defense for role-based access — each dashboard page also
// re-checks the session server-side, since a matcher change here should
// never be the only thing standing between a role and someone else's data.
export default auth((req) => {
  const { nextUrl } = req;
  const session = req.auth;
  const isLoggedIn = !!session?.user;
  const role = session?.user?.role;
  const isLoginPage = nextUrl.pathname === "/login";
  // /help and /anatomy (and everything under them) are shared across every
  // role — a student and a coordinator both need to reach /help/tickets —
  // unlike every other section, which belongs to exactly one role's home
  // path. /help is public; of /anatomy, only the sign-up and plans pages are
  // (the explorer needs a session, and checks the plan itself).
  const isSharedPage = isSharedPath(nextUrl.pathname);
  const isHelpPage = nextUrl.pathname === "/help" || nextUrl.pathname.startsWith("/help/");
  // "/" is the public marketing page, reachable without a session like
  // /help and /login. A logged-in visitor still gets bounced off "/" and
  // /login to their dashboard below — /help is the one exception that
  // stays reachable either way, handled with the shared pages below.
  const isPublicPage =
    isLoginPage || isPublicAuthPage(nextUrl.pathname) || nextUrl.pathname === "/" || isHelpPage || isPublicAnatomyPage(nextUrl.pathname);

  if (!isLoggedIn) {
    if (isPublicPage) return NextResponse.next();
    // Praxxt Anatomy has its own login page, which always returns to /anatomy.
    const loginPath = loginPathFor(nextUrl.pathname);
    const loginUrl = new URL(loginPath, nextUrl);
    if (loginPath === "/login") loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  const home = role ? ROLE_HOME[role] : "/login";

  if (isLoginPage) {
    return NextResponse.redirect(new URL(home, nextUrl));
  }

  if (isSharedPage) {
    return NextResponse.next();
  }

  if (!nextUrl.pathname.startsWith(home)) {
    return NextResponse.redirect(new URL(home, nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  // sw.js, manifest.json, icons, and images must be reachable by anyone
  // (including logged-out visitors and the browser's own service-worker
  // fetcher) with their real content — routing them through the
  // login/role-home redirect logic above corrupts them into a redirect
  // target's HTML. images/ specifically holds the public landing page's
  // own assets (e.g. the hero photo) — without this exclusion, even a
  // logged-in user's browser gets its request for that photo hijacked
  // into a redirect to their dashboard, since the check above doesn't
  // know an <img>/<Image> request is any different from a page navigation.
  // uploads/ is excluded for the same reason, but is NOT public: its route
  // handler enforces sign-in and per-student ownership itself.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|icon.png|apple-touch-icon.png|sw.js|manifest.json|icons/|images/|uploads/).*)",
  ],
};
