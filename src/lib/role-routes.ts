import type { Role } from "@/generated/prisma/client";

// Where each role lands after login, and the section of the site they own.
export const ROLE_HOME: Record<Role, string> = {
  STUDENT: "/student",
  SUPERVISOR: "/supervisor",
  COORDINATOR: "/coordinator",
  SUPER_ADMIN: "/admin",
};
