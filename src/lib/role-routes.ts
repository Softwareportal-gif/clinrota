import type { Role } from "@/generated/prisma/client";

// Where each role lands after login, and the section of the site they own.
export const ROLE_HOME: Record<Role, string> = {
  STUDENT: "/student",
  SUPERVISOR: "/supervisor",
  COORDINATOR: "/coordinator",
  SUPER_ADMIN: "/admin",
};

// Sections every signed-in role can reach, unlike the role homes above:
// /help (training videos, support tickets) and /anatomy (Body Explorer).
const SHARED_SECTIONS = ["/help", "/anatomy"];

export function isSharedPath(pathname: string): boolean {
  return SHARED_SECTIONS.some((section) => pathname === section || pathname.startsWith(`${section}/`));
}
