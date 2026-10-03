"use client";

import { useActionState } from "react";
import { recalculateScore } from "@/app/coordinator/actions";

export function RecalculateScoreButton({
  rotationId,
  hasScore,
}: {
  rotationId: string;
  hasScore: boolean;
}) {
  const action = recalculateScore.bind(null, rotationId);
  const [state, formAction, isPending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <button
        type="submit"
        disabled={isPending}
        className="shrink-0 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 disabled:opacity-60"
      >
        {isPending ? "Calculating..." : hasScore ? "Recalculate" : "Calculate"}
      </button>
      {state?.error && <p className="max-w-[16rem] text-right text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
