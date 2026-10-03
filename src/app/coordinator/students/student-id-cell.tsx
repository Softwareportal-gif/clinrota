"use client";

import { useState } from "react";
import { updateStudentIdNumber } from "./actions";

// Inline edit, not a full edit-profile page — this is the most common
// cleanup a coordinator does right after every CSV import (replacing the
// auto-generated IMPORT-XXXXXXXX placeholder with the real institutional
// ID), so it needs to be reachable without leaving the roster.
export function StudentIdCell({
  studentProfileId,
  initialValue,
}: {
  studentProfileId: string;
  initialValue: string;
}) {
  const [value, setValue] = useState(initialValue);
  const [draft, setDraft] = useState(initialValue);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSave() {
    setError(null);
    setIsPending(true);
    const result = await updateStudentIdNumber(studentProfileId, draft);
    setIsPending(false);
    if (result.ok) {
      setValue(draft.trim());
      setEditing(false);
    } else {
      setError(result.error);
    }
  }

  function handleCancel() {
    setDraft(value);
    setError(null);
    setEditing(false);
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-gray-700">{value}</span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-xs font-medium text-blue-600 hover:underline"
        >
          Edit
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={isPending}
          autoFocus
          className="w-36 rounded-md border border-gray-300 px-2 py-1 text-sm"
        />
        <button
          type="button"
          disabled={isPending}
          onClick={handleSave}
          className="text-xs font-medium text-blue-600 hover:underline disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={handleCancel}
          className="text-xs text-gray-500 hover:underline"
        >
          Cancel
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
