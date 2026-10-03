"use client";

import { useActionState, useRef } from "react";
import { createTicket } from "./actions";

const DEEP_TEAL = "#0A3F38";

export function TicketForm({
  initialSubject,
  initialDescription,
}: {
  initialSubject?: string;
  initialDescription?: string;
}) {
  const [state, formAction, isPending] = useActionState(createTicket, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await formAction(formData);
        formRef.current?.reset();
      }}
      className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6"
    >
      <div>
        <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
          Subject
        </label>
        <input
          id="subject"
          name="subject"
          type="text"
          required
          defaultValue={initialSubject}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base"
        />
      </div>
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          What&apos;s going on?
        </label>
        <textarea
          id="description"
          name="description"
          rows={5}
          required
          defaultValue={initialDescription}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base"
        />
      </div>
      {(initialSubject || initialDescription) && (
        <p className="text-xs text-gray-500">
          Pre-filled from your chat with Beatrice — review and edit before submitting.
        </p>
      )}

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.ok && <p className="text-sm text-green-700">Ticket sent — we&apos;ll follow up by email.</p>}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        style={{ backgroundColor: DEEP_TEAL }}
      >
        {isPending ? "Sending..." : "Submit ticket"}
      </button>
    </form>
  );
}
