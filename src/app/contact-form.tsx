"use client";

import { useActionState } from "react";
import { submitContactRequest, type ContactFormState } from "./contact-actions";

export function ContactForm() {
  const [state, formAction, isPending] = useActionState<ContactFormState, FormData>(
    submitContactRequest,
    undefined
  );

  if (state?.ok) {
    return (
      <div className="rounded-xl border border-[#DCD8F5] bg-[#F8F7FF] p-6 text-center">
        <p className="text-lg font-semibold" style={{ color: "#17153B" }}>
          Thanks — we&apos;ll be in touch.
        </p>
        <p className="mt-1 text-sm text-[#4A4867]">
          We usually reply within a day or two.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="block text-sm font-semibold text-[#17153B]">
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            className="mt-1 block w-full rounded-lg border border-[#DCD8F5] bg-white px-3 py-2.5 text-[#17153B] focus:border-[#5A3BF0] focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-semibold text-[#17153B]">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="mt-1 block w-full rounded-lg border border-[#DCD8F5] bg-white px-3 py-2.5 text-[#17153B] focus:border-[#5A3BF0] focus:outline-none"
          />
        </div>
      </div>
      <div>
        <label htmlFor="institution" className="block text-sm font-semibold text-[#17153B]">
          Institution (optional)
        </label>
        <input
          id="institution"
          name="institution"
          type="text"
          className="mt-1 block w-full rounded-lg border border-[#DCD8F5] bg-white px-3 py-2.5 text-[#17153B] focus:border-[#5A3BF0] focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="message" className="block text-sm font-semibold text-[#17153B]">
          What would you like to know?
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          required
          className="mt-1 block w-full rounded-lg border border-[#DCD8F5] bg-white px-3 py-2.5 text-[#17153B] focus:border-[#5A3BF0] focus:outline-none"
        />
      </div>

      {state?.ok === false && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-full bg-gradient-to-r from-[#5A3BF0] to-[#2563EB] px-7 py-3.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {isPending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
