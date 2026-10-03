"use client";

import { useActionState } from "react";
import { addCompetency } from "./actions";

export function AddForm() {
  const [state, formAction, isPending] = useActionState(addCompetency, undefined);

  return (
    <form
      action={formAction}
      className="flex flex-wrap items-end gap-3 rounded-md border border-gray-200 bg-white p-4"
    >
      <div>
        <label htmlFor="name" className="block text-xs font-medium text-gray-600">
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          placeholder="e.g. Performs a lumbar puncture"
          className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <div className="min-w-[12rem] flex-1">
        <label htmlFor="description" className="block text-xs font-medium text-gray-600">
          Description (optional)
        </label>
        <input
          id="description"
          name="description"
          type="text"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {isPending ? "Adding..." : "Add"}
      </button>
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
