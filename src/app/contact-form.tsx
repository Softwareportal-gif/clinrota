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
      <div className="rounded-xl border border-[#0A3F38]/15 bg-[#0A3F38]/[0.04] p-6 text-center">
        <p className="text-lg font-semibold" style={{ color: "#0A3F38" }}>
          Thanks — we&apos;ll be in touch.
        </p>
        <p className="mt-1 text-sm text-[#10201C]/70">
          We usually reply within a day or two.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="block text-sm font-semibold text-[#10201C]">
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            className="mt-1 block w-full rounded-lg border border-[#0A3F38]/15 bg-white px-3 py-2.5 text-[#10201C] focus:border-[#E8734A] focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-semibold text-[#10201C]">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="mt-1 block w-full rounded-lg border border-[#0A3F38]/15 bg-white px-3 py-2.5 text-[#10201C] focus:border-[#E8734A] focus:outline-none"
          />
        </div>
      </div>
      <div>
        <label htmlFor="institution" className="block text-sm font-semibold text-[#10201C]">
          Institution (optional)
        </label>
        <input
          id="institution"
          name="institution"
          type="text"
          className="mt-1 block w-full rounded-lg border border-[#0A3F38]/15 bg-white px-3 py-2.5 text-[#10201C] focus:border-[#E8734A] focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="message" className="block text-sm font-semibold text-[#10201C]">
          What would you like to know?
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          required
          className="mt-1 block w-full rounded-lg border border-[#0A3F38]/15 bg-white px-3 py-2.5 text-[#10201C] focus:border-[#E8734A] focus:outline-none"
        />
      </div>

      {state?.ok === false && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-[#E8734A] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#D4653D] disabled:opacity-60"
      >
        {isPending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
