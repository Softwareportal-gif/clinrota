"use client";

import { useActionState } from "react";
import { overrideScore } from "@/app/coordinator/actions";

export function OverrideForm({
  rotationId,
  currentFinalScore,
  currentReason,
}: {
  rotationId: string;
  currentFinalScore: number;
  currentReason: string;
}) {
  const action = overrideScore.bind(null, rotationId);
  const [state, formAction, isPending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="space-y-3 rounded-md border border-gray-200 bg-white p-4">
      <p className="text-sm font-medium text-gray-700">Override final score</p>
      <div>
        <label htmlFor="overrideScore" className="block text-xs text-gray-500">
          Override score (0–100)
        </label>
        <input
          id="overrideScore"
          name="overrideScore"
          type="number"
          min={0}
          max={100}
          step={0.1}
          defaultValue={currentFinalScore}
          required
          className="mt-1 block w-32 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        />
      </div>
      <div>
        <label htmlFor="reason" className="block text-xs text-gray-500">
          Reason (required)
        </label>
        <textarea
          id="reason"
          name="reason"
          rows={3}
          defaultValue={currentReason}
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm text-green-600">{state.success}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {isPending ? "Saving..." : "Save override"}
      </button>
    </form>
  );
}
