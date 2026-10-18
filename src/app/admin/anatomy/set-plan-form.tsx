"use client";

import { useActionState } from "react";
import { setAnatomyPlan } from "./actions";

const field = "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm";

export function SetPlanForm() {
  const [state, action, pending] = useActionState(setAnatomyPlan, undefined);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
      <div>
        <label htmlFor="plan-email" className="block text-sm font-medium text-gray-700">
          User email
        </label>
        <input id="plan-email" name="email" type="email" required className={field} />
      </div>
      <div>
        <label htmlFor="plan-plan" className="block text-sm font-medium text-gray-700">
          Plan
        </label>
        <select id="plan-plan" name="plan" defaultValue="STUDENT" className={field}>
          <option value="TRIAL">Trial</option>
          <option value="STUDENT">Student</option>
          <option value="PROFESSIONAL">Professional</option>
          <option value="INSTITUTION">Institution</option>
        </select>
      </div>
      <div>
        <label htmlFor="plan-months" className="block text-sm font-medium text-gray-700">
          Months from today
        </label>
        <input id="plan-months" name="months" type="number" min={0} max={36} defaultValue={12} className={field} />
      </div>
      <button type="submit" disabled={pending} className="rounded-md bg-[#5A3BF0] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
        {pending ? "Saving…" : "Set plan"}
      </button>
      {state?.error && <p className="text-sm text-red-600 sm:col-span-4">{state.error}</p>}
      {state?.done && <p className="text-sm text-green-700 sm:col-span-4">{state.done}</p>}
    </form>
  );
}
