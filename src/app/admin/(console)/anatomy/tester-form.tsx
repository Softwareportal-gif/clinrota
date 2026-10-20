"use client";

import { useActionState } from "react";
import { createTesterAccount } from "./actions";

const field = "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm";

export function TesterForm() {
  const [state, action, pending] = useActionState(createTesterAccount, undefined);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[2fr_2fr_1fr_auto] sm:items-end">
      <div>
        <label htmlFor="tester-email" className="block text-sm font-medium text-gray-700">
          Tester email
        </label>
        <input id="tester-email" name="email" type="email" required autoComplete="off" placeholder="tester@praxxt.com" className={field} />
      </div>
      <div>
        <label htmlFor="tester-password" className="block text-sm font-medium text-gray-700">
          Password (10+ characters)
        </label>
        <input id="tester-password" name="password" type="text" required minLength={10} autoComplete="new-password" className={field} />
      </div>
      <div>
        <label htmlFor="tester-months" className="block text-sm font-medium text-gray-700">
          Months
        </label>
        <input id="tester-months" name="months" type="number" min={1} max={12} defaultValue={3} className={field} />
      </div>
      <input type="hidden" name="name" value="Praxxt Anatomy tester" />
      <button type="submit" disabled={pending} className="rounded-md bg-[#5A3BF0] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
        {pending ? "Creating…" : "Create tester login"}
      </button>
      {state?.error && <p className="text-sm text-red-600 sm:col-span-4">{state.error}</p>}
      {state?.done && <p className="text-sm text-green-700 sm:col-span-4">{state.done}</p>}
    </form>
  );
}
