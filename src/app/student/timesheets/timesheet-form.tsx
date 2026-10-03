"use client";

import { useState } from "react";
import { submitTimesheetCore } from "./actions";
import { submitWithFallback } from "@/lib/offline/submit-with-fallback";
import type { SubmitTimesheetPayload } from "@/lib/offline/payloads";

export function TimesheetForm({ rotationId, userId }: { rotationId: string; userId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [queuedMessage, setQueuedMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setQueuedMessage(null);
    setIsPending(true);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const shiftDate = String(formData.get("shiftDate") ?? "");
    const clockInTime = formData.get("clockIn");
    const clockOutTime = formData.get("clockOut");

    const id = crypto.randomUUID();
    const payload: SubmitTimesheetPayload = {
      id,
      rotationId,
      shiftDate,
      clockIn: clockInTime ? `${shiftDate}T${clockInTime}` : null,
      clockOut: clockOutTime ? `${shiftDate}T${clockOutTime}` : null,
      hours: Number(formData.get("hours")) || 0,
      notes: (formData.get("notes") as string) || null,
    };

    const outcome = await submitWithFallback({
      id,
      userId,
      opType: "submit-timesheet",
      payload,
      action: () => submitTimesheetCore(payload),
    });

    setIsPending(false);

    if (outcome.synced) {
      if (outcome.result.error) {
        setError(outcome.result.error);
        return;
      }
      form.reset();
    } else {
      setQueuedMessage(
        "You're offline — saved on this device and will sync automatically once you're back online."
      );
      form.reset();
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-md space-y-4 rounded-md border border-gray-200 bg-white p-4"
    >
      <div>
        <label htmlFor="shiftDate" className="block text-sm font-medium text-gray-700">
          Shift date
        </label>
        <input
          id="shiftDate"
          name="shiftDate"
          type="date"
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="clockIn" className="block text-sm font-medium text-gray-700">
            Clock in
          </label>
          <input
            id="clockIn"
            name="clockIn"
            type="time"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base"
          />
        </div>
        <div>
          <label htmlFor="clockOut" className="block text-sm font-medium text-gray-700">
            Clock out
          </label>
          <input
            id="clockOut"
            name="clockOut"
            type="time"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base"
          />
        </div>
      </div>

      <div>
        <label htmlFor="hours" className="block text-sm font-medium text-gray-700">
          Or enter hours directly
        </label>
        <input
          id="hours"
          name="hours"
          type="number"
          min={0}
          max={24}
          step={0.25}
          placeholder="Leave blank if using clock in/out"
          className="mt-1 block w-40 rounded-md border border-gray-300 px-3 py-2 text-base"
        />
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
          Notes (optional)
        </label>
        <input
          id="notes"
          name="notes"
          type="text"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {queuedMessage && <p className="text-sm text-amber-700">{queuedMessage}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
      >
        {isPending ? "Submitting..." : "Submit hours"}
      </button>
    </form>
  );
}
