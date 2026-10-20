import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { Role } from "@/generated/prisma/client";
import { loginPageForRole, ROLE_HOME } from "@/lib/role-routes";

export async function requireRole(role: Role) {
  const session = await auth();
  if (!session?.user) redirect(loginPageForRole(role));
  if (session.user.role !== role) redirect(ROLE_HOME[session.user.role]);
  return session;
}
