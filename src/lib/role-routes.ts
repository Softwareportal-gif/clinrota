import type { Role } from "@/generated/prisma/client";

// Where each role lands after login, and the section of the site they own.
export const ROLE_HOME: Record<Role, string> = {
  STUDENT: "/student",
  SUPERVISOR: "/supervisor",
  COORDINATOR: "/coordinator",
  SUPER_ADMIN: "/admin",
  LEARNER: "/anatomy", // signed up for Praxxt Anatomy only
};

// Sections every signed-in role can reach, unlike the role homes above:
// /help (training videos, support tickets) and /anatomy (Body Explorer).
const SHARED_SECTIONS = ["/help", "/anatomy"];

export function isSharedPath(pathname: string): boolean {
  return SHARED_SECTIONS.some((section) => pathname === section || pathname.startsWith(`${section}/`));
}

// Praxxt Anatomy's sign-up, plans and login pages are open to visitors who
// aren't signed in, so anyone can start a trial, compare plans or log in.
const PUBLIC_ANATOMY_PAGES = ["/anatomy/start", "/anatomy/plans", "/anatomy/login"];

export function isPublicAnatomyPage(pathname: string): boolean {
  return PUBLIC_ANATOMY_PAGES.some((page) => pathname === page || pathname.startsWith(`${page}/`));
}

const under = (pathname: string, section: string) => pathname === section || pathname.startsWith(`${section}/`);

// Each product has its own login page: Praxxt Anatomy (sold apart from the
// clinical platform), the owner's admin console, and the clinical platform
// itself. A logged-out visitor is sent to the one for where they were going.
export function loginPathFor(pathname: string): string {
  if (under(pathname, "/anatomy")) return "/anatomy/login";
  if (under(pathname, "/admin")) return "/admin/login";
  return "/login";
}

// The login page a role signs in on, and returns to when it logs out.
export function loginPageForRole(role: Role | undefined): string {
  if (role === "SUPER_ADMIN") return "/admin/login";
  if (role === "LEARNER") return "/anatomy/login";
  return "/login";
}

// Login pages besides /login that visitors without a session may open.
export function isPublicAuthPage(pathname: string): boolean {
  return pathname === "/admin/login";
}
