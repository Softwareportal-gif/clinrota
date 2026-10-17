"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { isOverLimit, LIMITS, requestIp } from "@/lib/rate-limit";

const TOO_MANY_SIGN_INS =
  'Too many sign-in attempts. Wait 15 minutes and try again, or use "Email me a sign-in link".';

export type LoginState = { error?: string } | undefined;

// A callbackUrl travels through a plain form field (client-supplied), so
// it's validated here at the point of use, not trusted just because the
// page rendered it — the same principle as never trusting client-side
// "valid" flags for anything else in this codebase. Only a same-origin
// relative path is accepted: it must start with exactly one "/", never
// "//" or "/\" (both of which browsers can treat as protocol-relative,
// i.e. "//evil.example.com" resolves to https://evil.example.com). This
// is the standard guard against an open-redirect via a login callback
// param — reject anything else and fall back to the normal role-based
// default rather than following it.
function sanitizeCallbackUrl(value: FormDataEntryValue | null): string | undefined {
  if (typeof value !== "string" || value === "") return undefined;
  if (!/^\/(?!\/|\\)/.test(value)) return undefined;
  return value;
}

export async function loginWithCredentials(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const callbackUrl = sanitizeCallbackUrl(formData.get("callbackUrl"));

  // The limit itself is enforced (and attempts counted) in the
  // credentials provider in src/auth.ts; this only turns it into a clear
  // message instead of "Incorrect email or password".
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (
    (await isOverLimit(`login:email:${email}`, LIMITS.loginEmail)) ||
    (await isOverLimit(`login:ip:${await requestIp()}`, LIMITS.loginIp))
  ) {
    return { error: TOO_MANY_SIGN_INS };
  }

  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: callbackUrl ?? "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Incorrect email or password." };
    }
    throw error;
  }
}

export async function loginWithMagicLink(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = formData.get("email");
  if (typeof email !== "string" || !email) {
    return { error: "Enter your email address first." };
  }

  const callbackUrl = sanitizeCallbackUrl(formData.get("callbackUrl"));
  if (await isOverLimit(`magic:email:${email.trim().toLowerCase()}`, LIMITS.magicLinkEmail)) {
    return { error: "Too many sign-in links requested for this address. Try again in an hour." };
  }
  try {
    await signIn("resend", { email, redirectTo: callbackUrl ?? "/" });
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        error:
          "Could not send the sign-in link. (This needs a RESEND_API_KEY configured in .env.)",
      };
    }
    throw error;
  }
}
