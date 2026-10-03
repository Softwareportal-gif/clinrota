"use client";

import { useActionState } from "react";
import { updateStudentProfile } from "./actions";
import { TEAL, TEXT_SECONDARY, BORDER } from "../dashboard-sections/colors";

export function ProfileEditForm({
  phone,
  areasOfInterest,
  personalStatement,
}: {
  phone: string | null;
  areasOfInterest: string | null;
  personalStatement: string | null;
}) {
  const [state, formAction, isPending] = useActionState(updateStudentProfile, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="phone" className="block text-xs font-medium" style={{ color: TEXT_SECONDARY }}>
          Phone
        </label>
        <input
          id="phone"
          name="phone"
          type="text"
          defaultValue={phone ?? ""}
          className="mt-1 block w-full max-w-xs rounded-md px-3 py-2 text-sm"
          style={{ border: `1px solid ${BORDER}` }}
        />
      </div>
      <div>
        <label htmlFor="areasOfInterest" className="block text-xs font-medium" style={{ color: TEXT_SECONDARY }}>
          Areas of interest
        </label>
        <input
          id="areasOfInterest"
          name="areasOfInterest"
          type="text"
          placeholder="e.g. Maternal health, emergency care"
          defaultValue={areasOfInterest ?? ""}
          className="mt-1 block w-full rounded-md px-3 py-2 text-sm"
          style={{ border: `1px solid ${BORDER}` }}
        />
      </div>
      <div>
        <label htmlFor="personalStatement" className="block text-xs font-medium" style={{ color: TEXT_SECONDARY }}>
          Personal statement
        </label>
        <textarea
          id="personalStatement"
          name="personalStatement"
          rows={5}
          defaultValue={personalStatement ?? ""}
          className="mt-1 block w-full rounded-md px-3 py-2 text-sm"
          style={{ border: `1px solid ${BORDER}` }}
        />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.ok && <p className="text-sm" style={{ color: TEAL }}>Saved.</p>}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        style={{ backgroundColor: TEAL }}
      >
        {isPending ? "Saving..." : "Save changes"}
      </button>
    </form>
  );
}
