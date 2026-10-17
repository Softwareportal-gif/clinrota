"use client";

import { useActionState, useState, useTransition } from "react";
import { addCohorts, deleteCohort, updateCohort, type CohortFormState } from "./actions";

const inputClass = "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base sm:text-sm";

export type CohortFields = { academicYear: string; term: string; startDate: string; endDate: string };

function DetailFields({ idPrefix, defaults }: { idPrefix: string; defaults: CohortFields }) {
  return (
    <>
      <div>
        <label htmlFor={`${idPrefix}-year`} className="block text-sm font-medium text-gray-700">
          Academic year
        </label>
        <input id={`${idPrefix}-year`} name="academicYear" required defaultValue={defaults.academicYear} placeholder="2026/2027" className={inputClass} />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-term`} className="block text-sm font-medium text-gray-700">
          Term
        </label>
        <input id={`${idPrefix}-term`} name="term" required defaultValue={defaults.term} placeholder="Semester 1" className={inputClass} />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-start`} className="block text-sm font-medium text-gray-700">
          Start date
        </label>
        <input id={`${idPrefix}-start`} name="startDate" type="date" required defaultValue={defaults.startDate} className={inputClass} />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-end`} className="block text-sm font-medium text-gray-700">
          End date
        </label>
        <input id={`${idPrefix}-end`} name="endDate" type="date" required defaultValue={defaults.endDate} className={inputClass} />
      </div>
    </>
  );
}

function StateMessage({ state }: { state: CohortFormState }) {
  if (!state) return null;
  return state.ok ? (
    <p className="text-sm text-green-700">{state.message}</p>
  ) : (
    <p className="text-sm text-red-600">{state.error}</p>
  );
}

export function AddCohortsForm({ defaults }: { defaults: CohortFields }) {
  const [state, formAction, isPending] = useActionState(addCohorts, undefined);
  return (
    <form
      key={state?.ok ? state.message : "add"}
      action={formAction}
      className="space-y-4 rounded-md border border-gray-200 bg-white p-4"
    >
      <div>
        <label htmlFor="cohort-names" className="block text-sm font-medium text-gray-700">
          Cohort names
        </label>
        <input
          id="cohort-names"
          name="names"
          required
          placeholder="Level 100, Level 200, Level 300, Level 400"
          className={inputClass}
        />
        <p className="mt-1 text-xs text-gray-500">Separate several with commas to add them all at once.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <DetailFields idPrefix="new" defaults={defaults} />
      </div>
      <StateMessage state={state} />
      <button type="submit" disabled={isPending} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
        {isPending ? "Adding…" : "Add cohorts"}
      </button>
    </form>
  );
}

export function EditCohortForm({
  cohortId,
  name,
  defaults,
  deletable,
}: {
  cohortId: string;
  name: string;
  defaults: CohortFields;
  deletable: boolean;
}) {
  const [state, formAction, isPending] = useActionState(updateCohort.bind(null, cohortId), undefined);
  const [deleteState, setDeleteState] = useState<CohortFormState>(undefined);
  const [isDeleting, startDelete] = useTransition();

  return (
    <details className="mt-2">
      <summary className="cursor-pointer text-sm font-medium text-blue-600">Edit</summary>
      <form action={formAction} className="mt-3 space-y-4 rounded-md bg-gray-50 p-4">
        <div>
          <label htmlFor={`${cohortId}-name`} className="block text-sm font-medium text-gray-700">
            Name
          </label>
          <input id={`${cohortId}-name`} name="name" required defaultValue={name} className={inputClass} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <DetailFields idPrefix={cohortId} defaults={defaults} />
        </div>
        <StateMessage state={state} />
        <StateMessage state={deleteState} />
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={isPending} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
            {isPending ? "Saving…" : "Save changes"}
          </button>
          {deletable ? (
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => {
                if (confirm(`Delete ${name}? This can't be undone.`)) {
                  startDelete(async () => setDeleteState(await deleteCohort(cohortId)));
                }
              }}
              className="rounded-md border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </button>
          ) : (
            <span className="text-xs text-gray-500">Cohorts with students or history can&apos;t be deleted.</span>
          )}
        </div>
      </form>
    </details>
  );
}
