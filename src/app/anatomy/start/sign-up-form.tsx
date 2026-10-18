"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUpForTrial } from "../plan-actions";
import { BRAND } from "../marketing";

const input = "mt-1 block w-full rounded-xl border px-3.5 py-2.5 text-base outline-none focus:border-[#5A3BF0]";

export function SignUpForm() {
  const [state, action, pending] = useActionState(signUpForTrial, undefined);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-semibold">
          Full name
        </label>
        <input id="name" name="name" required autoComplete="name" defaultValue={state?.values?.name} className={input} style={{ borderColor: BRAND.line }} />
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-semibold">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue={state?.values?.email}
          className={input}
          style={{ borderColor: BRAND.line }}
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-semibold">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={input}
          style={{ borderColor: BRAND.line }}
        />
        <p className="mt-1 text-xs" style={{ color: BRAND.muted }}>
          At least 8 characters.
        </p>
      </div>
      <label className="flex items-start gap-2.5 text-sm" style={{ color: BRAND.body }}>
        <input type="checkbox" name="terms" required className="mt-0.5 h-4 w-4 accent-[#5A3BF0]" />
        <span>
          I agree to use Praxxt Anatomy for learning, and understand study cards are not yet all reviewed by clinical experts.
        </span>
      </label>
      {state?.error && (
        <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full cursor-pointer rounded-full px-6 py-3.5 text-base font-bold text-white transition hover:brightness-110 disabled:opacity-60"
        style={{ background: BRAND.warm }}
      >
        {pending ? "Creating your account…" : "Create my free account"}
      </button>
      <p className="text-center text-sm" style={{ color: BRAND.body }}>
        Already have a Praxxt account?{" "}
        <Link href="/login?callbackUrl=/anatomy" className="font-bold underline" style={{ color: BRAND.violet }}>
          Log in
        </Link>
      </p>
    </form>
  );
}
