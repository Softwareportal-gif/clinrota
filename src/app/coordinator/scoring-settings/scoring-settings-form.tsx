"use client";

import { useActionState } from "react";
import { saveScoringConfig } from "./actions";

export function ScoringSettingsForm({
  initialSupervisorPercent,
  initialLogbookPercent,
  initialPassThreshold,
}: {
  initialSupervisorPercent: number;
  initialLogbookPercent: number;
  initialPassThreshold: number;
}) {
  const [state, formAction, isPending] = useActionState(saveScoringConfig, undefined);

  return (
    <form
      action={formAction}
      className="max-w-md space-y-5 rounded-md border border-gray-200 bg-white p-4"
    >
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="supervisorWeightPercent"
            className="block text-sm font-medium text-gray-700"
          >
            Supervisor score weight (%)
          </label>
          <input
            id="supervisorWeightPercent"
            name="supervisorWeightPercent"
            type="number"
            min={0}
            max={100}
            defaultValue={initialSupervisorPercent}
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base"
          />
        </div>
        <div>
          <label
            htmlFor="logbookWeightPercent"
            className="block text-sm font-medium text-gray-700"
          >
            Logbook score weight (%)
          </label>
          <input
            id="logbookWeightPercent"
            name="logbookWeightPercent"
            type="number"
            min={0}
            max={100}
            defaultValue={initialLogbookPercent}
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base"
          />
        </div>
      </div>
      <p className="text-xs text-gray-500">These two must add up to 100.</p>

      <div>
        <label htmlFor="passThreshold" className="block text-sm font-medium text-gray-700">
          Pass threshold (%)
        </label>
        <input
          id="passThreshold"
          name="passThreshold"
          type="number"
          min={0}
          max={100}
          defaultValue={initialPassThreshold}
          required
          className="mt-1 block w-40 rounded-md border border-gray-300 px-3 py-2 text-base"
        />
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm text-green-600">Saved.</p>}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
      >
        {isPending ? "Saving..." : "Save settings"}
      </button>
    </form>
  );
}
