"use client";

import { useActionState } from "react";
import { decideDocument } from "./actions";

export function ReviewDocForm({ documentId }: { documentId: string }) {
  const action = decideDocument.bind(null, documentId);
  const [state, formAction, isPending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="space-y-4 rounded-md border border-gray-200 bg-white p-4">
      <div>
        <label htmlFor="reason" className="block text-sm font-medium text-gray-700">
          Rejection reason (required to reject)
        </label>
        <textarea
          id="reason"
          name="reason"
          rows={3}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base"
        />
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          name="intent"
          value="verify"
          disabled={isPending}
          className="rounded-md bg-green-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
        >
          Verify
        </button>
        <button
          type="submit"
          name="intent"
          value="reject"
          disabled={isPending}
          className="rounded-md border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 disabled:opacity-60"
        >
          Reject
        </button>
      </div>
    </form>
  );
}
