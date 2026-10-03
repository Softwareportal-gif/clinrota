"use client";

import { useActionState } from "react";
import { toggleCompetencyActive } from "./actions";

export function ToggleActiveButton({
  competencyId,
  isActive,
}: {
  competencyId: string;
  isActive: boolean;
}) {
  const action = toggleCompetencyActive.bind(null, competencyId);
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
