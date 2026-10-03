"use client";

import { useState, useTransition } from "react";
import {
  setWardSupervisionEnabled,
  addWardSupervisorEligibility,
  removeWardSupervisorEligibility,
  inviteWardSupervisor,
} from "./ward-supervision-actions";

type EligibleSupervisor = { eligibilityId: string; supervisorProfileId: string; name: string; email: string };
type SelectableSupervisor = { supervisorProfileId: string; name: string; email: string };

export function WardSupervisionSection({
  siteId,
  initialEnabled,
  eligibleSupervisors,
  selectableSupervisors,
}: {
  siteId: string;
  initialEnabled: boolean;
  eligibleSupervisors: EligibleSupervisor[];
  // Supervisors in this institution not already on the roster below.
  selectableSupervisors: SelectableSupervisor[];
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [isPending, startTransition] = useTransition();
  const [selectedExisting, setSelectedExisting] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  function toggleEnabled() {
    const next = !enabled;
    setEnabled(next);
    startTransition(async () => {
      await setWardSupervisionEnabled(siteId, next);
    });
  }

  function handleAddExisting(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedExisting) return;
    setMessage(null);
    startTransition(async () => {
      const result = await addWardSupervisorEligibility(siteId, selectedExisting);
      if (!result.ok) {
        setMessage({ text: result.error, isError: true });
      } else {
        setSelectedExisting("");
      }
    });
  }

  function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await inviteWardSupervisor(siteId, inviteName, inviteEmail);
      if (!result.ok) {
        setMessage({ text: result.error, isError: true });
      } else {
        setMessage({ text: `Invited ${inviteName}.`, isError: false });
        setInviteName("");
        setInviteEmail("");
      }
    });
  }

  function handleRemove(eligibilityId: string) {
    setMessage(null);
    startTransition(async () => {
      await removeWardSupervisorEligibility(siteId, eligibilityId);
    });
  }

  return (
    <div className="rounded-md border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900">Ward supervision</p>
          <p className="mt-0.5 text-xs text-gray-500">
            When on, students must select a ward and ward supervisor before their first case
            entry at this site. The ward supervisor reviews those entries — the main clinical
            supervisor on the rotation still does grading.
          </p>
        </div>
        <label className="ml-4 inline-flex shrink-0 cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={enabled}
            disabled={isPending}
            onChange={toggleEnabled}
            className="h-4 w-4 rounded border-gray-300"
          />
          <span className="text-sm text-gray-700">{enabled ? "On" : "Off"}</span>
        </label>
      </div>

      {enabled && (
        <div className="mt-4 space-y-4 border-t border-gray-100 pt-4">
          <div>
            <p className="mb-2 text-xs font-medium text-gray-700">Eligible ward supervisors</p>
            {eligibleSupervisors.length === 0 ? (
              <p className="text-sm text-gray-500">
                None yet — add one below before a student can log a case here.
              </p>
            ) : (
              <ul className="divide-y divide-gray-200 rounded-md border border-gray-200">
                {eligibleSupervisors.map((s) => (
                  <li key={s.eligibilityId} className="flex items-center justify-between gap-3 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-gray-900">{s.name}</p>
                      <p className="truncate text-xs text-gray-500">{s.email}</p>
                    </div>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleRemove(s.eligibilityId)}
                      className="shrink-0 text-xs font-medium text-red-600 hover:underline disabled:opacity-60"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {selectableSupervisors.length > 0 && (
            <form onSubmit={handleAddExisting} className="flex items-end gap-2">
              <div className="flex-1">
                <label htmlFor="existingSupervisor" className="block text-xs text-gray-600">
                  Add an existing supervisor
                </label>
                <select
                  id="existingSupervisor"
                  value={selectedExisting}
                  onChange={(e) => setSelectedExisting(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                >
                  <option value="">Select...</option>
                  {selectableSupervisors.map((s) => (
                    <option key={s.supervisorProfileId} value={s.supervisorProfileId}>
                      {s.name} ({s.email})
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={isPending || !selectedExisting}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 disabled:opacity-60"
              >
                Add
              </button>
            </form>
          )}

          <form onSubmit={handleInvite} className="space-y-2 rounded-md border border-gray-200 p-3">
            <p className="text-xs font-medium text-gray-700">Or invite a new supervisor by email</p>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label htmlFor="inviteName" className="block text-xs text-gray-600">
                  Name
                </label>
                <input
                  id="inviteName"
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                />
              </div>
              <div className="flex-1">
                <label htmlFor="inviteEmail" className="block text-xs text-gray-600">
                  Email
                </label>
                <input
                  id="inviteEmail"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={isPending || !inviteName.trim() || !inviteEmail.trim()}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 disabled:opacity-60"
              >
                Invite
              </button>
            </div>
          </form>

          {message && (
            <p className={`text-sm ${message.isError ? "text-red-600" : "text-green-700"}`}>{message.text}</p>
          )}
        </div>
      )}
    </div>
  );
}
