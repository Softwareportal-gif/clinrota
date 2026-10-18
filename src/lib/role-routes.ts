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

// Praxxt Anatomy's sign-up and plans pages are open to visitors who aren't
// signed in, so anyone can start a trial or compare plans.
const PUBLIC_ANATOMY_PAGES = ["/anatomy/start", "/anatomy/plans"];

export function isPublicAnatomyPage(pathname: string): boolean {
  return PUBLIC_ANATOMY_PAGES.some((page) => pathname === page || pathname.startsWith(`${page}/`));
}
