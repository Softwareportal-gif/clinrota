"use client";

import { useActionState } from "react";
import { addCoordinator } from "./actions";

const inputClass = "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base";

export function AddCoordinatorForm({ programId }: { programId: string }) {
  const [state, formAction, isPending] = useActionState(addCoordinator.bind(null, programId), undefined);

  return (
    <details className="mt-2">
      <summary className="cursor-pointer text-sm font-medium text-blue-600">+ Add coordinator</summary>
      {/* Remounting on each success (key) clears the fields for the next one. */}
      <form
        key={state?.ok ? state.message : "form"}
        action={formAction}
        className="mt-3 space-y-3 rounded-md bg-gray-50 p-4"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor={`name-${programId}`} className="block text-sm font-medium text-gray-700">
              Full name
            </label>
            <input id={`name-${programId}`} name="name" type="text" required className={inputClass} />
          </div>
          <div>
            <label htmlFor={`email-${programId}`} className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input id={`email-${programId}`} name="email" type="email" required className={inputClass} />
          </div>
        </div>
        <div>
          <label htmlFor={`password-${programId}`} className="block text-sm font-medium text-gray-700">
            Temporary password (optional)
          </label>
          <input
            id={`password-${programId}`}
            name="password"
            type="password"
            minLength={8}
            autoComplete="new-password"
            className={inputClass}
          />
          <p className="mt-1 text-xs text-gray-500">
            They&apos;re emailed an invitation to sign in with an emailed link. Set a password too
            if email isn&apos;t working yet, and share it with them yourself.
          </p>
        </div>
        {state && !state.ok && <p className="text-sm text-red-600">{state.error}</p>}
        {state?.ok && <p className="text-sm text-green-700">{state.message}</p>}
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {isPending ? "Adding…" : "Add coordinator"}
        </button>
      </form>
    </details>
  );
}
