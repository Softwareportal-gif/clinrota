"use client";

import { useActionState } from "react";
import { resolveTicket } from "./actions";

export function ResolveTicketButton({ ticketId }: { ticketId: string }) {
  const action = resolveTicket.bind(null, ticketId);
  const [state, formAction, isPending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <button
        type="submit"
        disabled={isPending}
        className="shrink-0 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 disabled:opacity-60"
      >
        {isPending ? "Saving..." : "Mark resolved"}
      </button>
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
