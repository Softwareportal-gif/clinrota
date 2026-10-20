"use client";

import { useActionState } from "react";
import { loginAsAdmin } from "./actions";

const input =
  "mt-1.5 block w-full rounded-lg border border-[#D9D7E8] bg-white px-3.5 py-2.5 text-base text-[#17153B] outline-none transition focus:border-[#5A3BF0] focus:ring-4 focus:ring-[#5A3BF0]/15";

export function AdminLoginForm() {
  const [state, action, pending] = useActionState(loginAsAdmin, undefined);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-semibold text-[#2A2850]">
          Email
        </label>
        <input id="email" name="email" type="email" required autoComplete="username" className={input} />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-semibold text-[#2A2850]">
          Password
        </label>
        <input id="password" name="password" type="password" required autoComplete="current-password" className={input} />
      </div>
      {state?.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full cursor-pointer rounded-lg bg-[#17153B] px-4 py-3 text-base font-semibold text-white transition hover:bg-[#2A2660] disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
