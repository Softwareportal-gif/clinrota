"use client";

import { useActionState } from "react";
import { createProgram } from "./actions";

type Template = { id: string; name: string; description: string | null };

export function ProgramForm({ templates }: { templates: Template[] }) {
  const [state, formAction, isPending] = useActionState(createProgram, undefined);

  return (
    <form action={formAction} className="max-w-lg space-y-5">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Program name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          placeholder="e.g. Physiotherapy Technician Diploma"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base"
        />
      </div>

      <div>
        <label htmlFor="degreeLevel" className="block text-sm font-medium text-gray-700">
          Degree level (optional)
        </label>
        <input
          id="degreeLevel"
          name="degreeLevel"
          type="text"
          placeholder="e.g. Diploma, BSc, MSc"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="defaultMinCases" className="block text-sm font-medium text-gray-700">
            Default min. cases (optional)
          </label>
          <input
            id="defaultMinCases"
            name="defaultMinCases"
            type="number"
            min={0}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base"
          />
        </div>
        <div>
          <label htmlFor="defaultMinHours" className="block text-sm font-medium text-gray-700">
            Default min. hours (optional)
          </label>
          <input
            id="defaultMinHours"
            name="defaultMinHours"
            type="number"
            min={0}
            step={0.5}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base"
          />
        </div>
      </div>

      <fieldset>
        <legend className="block text-sm font-medium text-gray-700">
          Discipline template
        </legend>
        <p className="mt-1 text-xs text-gray-500">
          Determines the supervisor evaluation rubric and any extra log fields this program
          uses. Every program must have one — pick the generic fallback if nothing
          discipline-specific has been built yet.
        </p>
        <div className="mt-2 space-y-2">
          {templates.map((t) => (
            <label
              key={t.id}
              className="flex items-start gap-2 rounded-md border border-gray-200 p-3 text-sm hover:bg-gray-50"
            >
              <input type="radio" name="disciplineTemplateId" value={t.id} required className="mt-0.5" />
              <span>
                <span className="block font-medium text-gray-900">{t.name}</span>
                {t.description && <span className="text-xs text-gray-500">{t.description}</span>}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
      >
        {isPending ? "Creating..." : "Create program"}
      </button>
    </form>
  );
}
