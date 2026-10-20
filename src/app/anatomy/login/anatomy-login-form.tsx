"use client";

import { useActionState } from "react";
import { loginWithCredentials } from "@/app/login/actions";
import { BRAND } from "../marketing";

const input = "mt-1 block w-full rounded-xl border px-3.5 py-2.5 text-base outline-none focus:border-[#5A3BF0]";

// Same sign-in as the main login (one Praxxt account system), but it always
// returns to Praxxt Anatomy.
export function AnatomyLoginForm() {
  const [state, action, pending] = useActionState(loginWithCredentials, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="callbackUrl" value="/anatomy" />
      <div>
        <label htmlFor="email" className="block text-sm font-semibold">
          Email
        </label>
        <input id="email" name="email" type="email" required autoComplete="email" className={input} style={{ borderColor: BRAND.line }} />
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
          autoComplete="current-password"
          className={input}
          style={{ borderColor: BRAND.line }}
        />
      </div>
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
        {pending ? "Logging in…" : "Log in"}
      </button>
    </form>
  );
}
