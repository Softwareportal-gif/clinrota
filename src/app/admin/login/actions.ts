"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isOverLimit, LIMITS, requestIp } from "@/lib/rate-limit";

export type AdminLoginState = { error?: string } | undefined;

const WRONG = "Incorrect email or password.";

// The admin console's own sign-in. Only super admin accounts get in here;
// anyone else gets the same message as a wrong password, so this page never
// reveals which emails have accounts. Attempts are limited as on /login.
export async function loginAsAdmin(_prev: AdminLoginState, formData: FormData): Promise<AdminLoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: WRONG };

  if ((await isOverLimit(`login:email:${email}`, LIMITS.loginEmail)) || (await isOverLimit(`login:ip:${await requestIp()}`, LIMITS.loginIp))) {
    return { error: "Too many sign-in attempts. Wait 15 minutes and try again." };
  }
  const user = await prisma.user.findUnique({ where: { email }, select: { role: true } });
  if (user?.role !== "SUPER_ADMIN") return { error: WRONG };

  try {
    await signIn("credentials", { email, password, redirectTo: "/admin" });
  } catch (error) {
    if (error instanceof AuthError) return { error: WRONG };
    throw error;
  }
}
