"use client";

import { useActionState } from "react";
import { toggleDocumentTypeActive } from "./actions";

export function ToggleActiveButton({ documentTypeId, isActive }: { documentTypeId: string; isActive: boolean }) {
  const action = toggleDocumentTypeActive.bind(null, documentTypeId);
  const [, formAction, isPending] = useActionState(action, undefined);

  return (
    <form action={formAction}>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 disabled:opacity-60"
      >
        {isActive ? "Deactivate" : "Reactivate"}
      </button>
    </form>
  );
}
