"use client";

import { useActionState } from "react";
import { decideTimesheet } from "./actions";

export function DecideButtons({ timesheetId }: { timesheetId: string }) {
  const action = decideTimesheet.bind(null, timesheetId);
  const [state, formAction, isPending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex items-center gap-2">
      <button
        type="submit"
        name="intent"
        value="approve"
        disabled={isPending}
        className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
      >
        Approve
      </button>
      <button
        type="submit"
        name="intent"
        value="reject"
        disabled={isPending}
        className="rounded-md border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 disabled:opacity-60"
      >
        Reject
      </button>
      {state?.error && <span className="text-xs text-red-600">{state.error}</span>}
    </form>
  );
}
