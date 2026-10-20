"use client";

import { deleteDraftEntry } from "./actions";

export function DeleteDraftButton({ logEntryId }: { logEntryId: string }) {
  return (
    <form
      action={deleteDraftEntry.bind(null, logEntryId)}
      onSubmit={(e) => {
        if (!window.confirm("Delete this draft case? This can't be undone.")) e.preventDefault();
      }}
    >
      <button type="submit" className="rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50">
        Delete draft
      </button>
    </form>
  );
}
