"use client";

import { useActionState } from "react";
import { cancelRotation, endRotationNow, restoreRotation, updateRotation, type RotationEditState } from "./actions";

const field = "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm";

type Option = { id: string; name: string };

export function RotationEditForm({
  rotationId,
  supervisors,
  wards,
  initial,
}: {
  rotationId: string;
  supervisors: Option[];
  wards: Option[];
  initial: { supervisorId: string; siteDepartmentId: string; startDate: string; endDate: string };
}) {
  const [state, action, pending] = useActionState<RotationEditState, FormData>(updateRotation.bind(null, rotationId), undefined);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label htmlFor="supervisorId" className="block text-sm font-medium text-gray-700">
          Supervisor
        </label>
        <select id="supervisorId" name="supervisorId" defaultValue={initial.supervisorId} required className={field}>
          {supervisors.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="siteDepartmentId" className="block text-sm font-medium text-gray-700">
          Ward
        </label>
        <select id="siteDepartmentId" name="siteDepartmentId" defaultValue={initial.siteDepartmentId} className={field}>
          <option value="">No specific ward</option>
          {wards.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
          Start date
        </label>
        <input id="startDate" name="startDate" type="date" defaultValue={initial.startDate} required className={field} />
      </div>
      <div>
        <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
          End date
        </label>
        <input id="endDate" name="endDate" type="date" defaultValue={initial.endDate} required className={field} />
      </div>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button type="submit" disabled={pending} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
          {pending ? "Saving…" : "Save changes"}
        </button>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state?.done && <p className="text-sm text-green-700">{state.done}</p>}
      </div>
    </form>
  );
}

// End, cancel or restore, each behind a confirmation.
export function RotationActions({ rotationId, canEnd, canCancel, canRestore }: { rotationId: string; canEnd: boolean; canCancel: boolean; canRestore: boolean }) {
  const confirmThen = (message: string) => (e: React.FormEvent) => {
    if (!window.confirm(message)) e.preventDefault();
  };
  return (
    <div className="flex flex-wrap gap-3">
      {canEnd && (
        <form action={endRotationNow.bind(null, rotationId)} onSubmit={confirmThen("End this rotation today? The student can still log for 7 days to catch up.")}>
          <button type="submit" className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50">
            End today
          </button>
        </form>
      )}
      {canCancel && (
        <form action={cancelRotation.bind(null, rotationId)} onSubmit={confirmThen("Cancel this rotation? The student won't be able to log cases or hours on it.")}>
          <button type="submit" className="rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50">
            Cancel rotation
          </button>
        </form>
      )}
      {canRestore && (
        <form action={restoreRotation.bind(null, rotationId)}>
          <button type="submit" className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50">
            Restore rotation
          </button>
        </form>
      )}
    </div>
  );
}
