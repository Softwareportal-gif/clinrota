"use client";

import { useActionState } from "react";
import { joinAnatomyWaitlist, type WaitlistState } from "./anatomy-waitlist-actions";

// Email-only waitlist for Praxxt Anatomy while it is "coming soon".
export function AnatomyWaitlistForm({ idPrefix = "waitlist" }: { idPrefix?: string }) {
  const [state, formAction, isPending] = useActionState<WaitlistState, FormData>(joinAnatomyWaitlist, undefined);

  if (state?.ok) {
    return (
      <div className="rounded-2xl border border-[#DCD8F5] bg-[#F8F7FF] p-5">
        <p className="font-bold text-[#17153B]">You&apos;re on the list.</p>
        <p className="mt-1 text-sm text-[#4A4867]">We&apos;ll email you as soon as Praxxt Anatomy opens.</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex w-full max-w-lg flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor={`${idPrefix}-email`} className="sr-only">
          Email address
        </label>
        <input
          id={`${idPrefix}-email`}
          name="email"
          type="email"
          required
          placeholder="Your email address"
          className="min-w-0 flex-1 rounded-full border border-[#DCD8F5] bg-white px-5 py-3.5 text-[#17153B] focus:border-[#5A3BF0] focus:outline-none"
        />
        <label htmlFor={`${idPrefix}-role`} className="sr-only">
          I am a
        </label>
        <select
          id={`${idPrefix}-role`}
          name="role"
          defaultValue=""
          className="rounded-full border border-[#DCD8F5] bg-white px-4 py-3.5 text-[#17153B] focus:border-[#5A3BF0] focus:outline-none"
        >
          <option value="" disabled>
            I am a…
          </option>
          <option>Student</option>
          <option>Health professional</option>
          <option>Educator</option>
          <option>Other</option>
        </select>
      </div>
      {state?.ok === false && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="w-fit cursor-pointer rounded-full px-7 py-3.5 text-base font-bold text-white transition duration-200 hover:brightness-110 disabled:opacity-60"
        style={{ background: "linear-gradient(90deg, #FF5C8A, #5A3BF0)", boxShadow: "0 10px 24px rgba(194,41,90,.25)" }}
      >
        {isPending ? "Joining…" : "Join the waitlist"}
      </button>
    </form>
  );
}
