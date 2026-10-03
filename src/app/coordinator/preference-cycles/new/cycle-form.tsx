"use client";

import { useActionState } from "react";
import { createPreferenceCycle } from "./actions";

export function CycleForm({ cohorts }: { cohorts: { id: string; label: string }[] }) {
  const [state, formAction, isPending] = useActionState(createPreferenceCycle, undefined);

  return (
    <form action={formAction} className="max-w-lg space-y-5">
      <div>
        <label htmlFor="cohortId" className="block text-sm font-medium text-gray-700">
          Cohort
        </label>
        <select
          id="cohortId"
          name="cohortId"
          required
          defaultValue=""
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base"
        >
          <option value="" disabled>
            Select a cohort
          </option>
          {cohorts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="minSelections" className="block text-sm font-medium text-gray-700">
            Minimum sites to rank
          </label>
          <input
            id="minSelections"
            name="minSelections"
            type="number"
            min={1}
            required
            defaultValue={3}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base"
          />
        </div>
        <div>
          <label htmlFor="maxSelections" className="block text-sm font-medium text-gray-700">
            Maximum sites to rank
          </label>
          <input
            id="maxSelections"
            name="maxSelections"
            type="number"
            min={1}
            required
            defaultValue={5}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base"
          />
        </div>
      </div>

      <div>
        <label htmlFor="submissionDeadline" className="block text-sm font-medium text-gray-700">
          Submission deadline
        </label>
        <input
          id="submissionDeadline"
          name="submissionDeadline"
          type="datetime-local"
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base"
        />
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
      >
        {isPending ? "Creating..." : "Open preference cycle"}
      </button>
    </form>
  );
}
