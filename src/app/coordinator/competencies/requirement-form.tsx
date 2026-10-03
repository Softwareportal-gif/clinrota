"use client";

import { useActionState } from "react";
import { updateRequirement } from "./actions";
import { ENTRUSTMENT_LEVEL_ORDER, ENTRUSTMENT_LEVEL_SHORT_LABELS } from "@/lib/entrustment";
import type { EntrustmentLevel } from "@/generated/prisma/client";

export function RequirementForm({
  competencyId,
  isRequired,
  minOccurrences,
  minEntrustmentLevel,
}: {
  competencyId: string;
  isRequired: boolean;
  minOccurrences: number;
  minEntrustmentLevel: EntrustmentLevel;
}) {
  const action = updateRequirement.bind(null, competencyId);
  const [state, formAction, isPending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-600">
      <label className="flex items-center gap-1.5">
        <input type="checkbox" name="required" defaultChecked={isRequired} />
        Required for this program
      </label>
      <label className="flex items-center gap-1.5">
        Min occurrences
        <input
          type="number"
          name="minOccurrences"
          min={1}
          defaultValue={minOccurrences}
          className="w-14 rounded border border-gray-300 px-1.5 py-0.5"
        />
      </label>
      <label className="flex items-center gap-1.5">
        Min level to count as demonstrated
        <select
          name="minEntrustmentLevel"
          defaultValue={minEntrustmentLevel}
          className="rounded border border-gray-300 px-1.5 py-0.5"
        >
          {ENTRUSTMENT_LEVEL_ORDER.map((level) => (
            <option key={level} value={level}>
              {ENTRUSTMENT_LEVEL_SHORT_LABELS[level]}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md border border-gray-300 px-2 py-1 font-medium text-gray-700 disabled:opacity-60"
      >
        {isPending ? "Saving..." : "Save"}
      </button>
      {state?.error && <span className="text-red-600">{state.error}</span>}
    </form>
  );
}
