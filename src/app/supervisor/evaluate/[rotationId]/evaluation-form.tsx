"use client";

import { useActionState } from "react";
import { saveEvaluation } from "./actions";
import { NOT_ASSESSED, type RubricDefinition } from "@/lib/discipline-template";

type CompetencyContextRow = {
  id: string;
  name: string;
  approvedCount: number;
  avgEntrustmentLevel: number | null;
};

export function EvaluationForm({
  rotationId,
  rubric,
  existingLevels,
  hasSavedEvaluation,
  initialOverallComments,
  competencyContext,
}: {
  rotationId: string;
  rubric: RubricDefinition;
  existingLevels: Record<string, number>;
  // A saved item with no rating was marked "not assessed" (the only way
  // to save without one), so it reopens with that option selected.
  hasSavedEvaluation: boolean;
  initialOverallComments: string;
  competencyContext: CompetencyContextRow[];
}) {
  const action = saveEvaluation.bind(null, rotationId);
  const [state, formAction, isPending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="space-y-6">
      {competencyContext.length > 0 && (
        <div className="rounded-md border border-gray-200 bg-white p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            For context — competencies demonstrated this rotation
          </p>
          <ul className="space-y-1 text-sm">
            {competencyContext.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2">
                <span className="text-gray-700">{c.name}</span>
                <span className="shrink-0 text-xs text-gray-500">
                  {c.approvedCount > 0
                    ? `${c.approvedCount} approved · avg level ${c.avgEntrustmentLevel?.toFixed(1)}`
                    : "No approved cases yet"}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-gray-400">
            Informational only — your rubric scores below are your own independent judgment.
          </p>
        </div>
      )}

      {rubric.source && <p className="text-xs text-gray-500">Evaluation tool: {rubric.source}</p>}

      {rubric.dimensions.map((dim) => (
        <div key={dim.key} className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-800">{dim.label}</h3>
          {dim.subDimensions.map((sub) => (
            <div key={sub.key} className="rounded-md border border-gray-200 bg-white p-3">
              <p className="text-sm font-medium text-gray-900">{sub.label}</p>
              {sub.description && <p className="mt-1 text-xs text-gray-500">{sub.description}</p>}
              <div
                className={`mt-2 grid grid-cols-1 gap-2 ${
                  rubric.scaleLevels.length > 5 ? "sm:grid-cols-3" : "sm:grid-cols-2"
                }`}
              >
                {rubric.scaleLevels.map((lvl) => (
                  <label
                    key={lvl.value}
                    className="flex items-start gap-2 rounded-md border border-gray-100 p-2 text-xs hover:bg-gray-50"
                  >
                    <input
                      type="radio"
                      name={`level_${sub.key}`}
                      value={lvl.value}
                      required
                      defaultChecked={existingLevels[sub.key] === lvl.value}
                      className="mt-0.5"
                    />
                    <span>
                      <span className="block font-medium text-gray-800">{lvl.label}</span>
                      {sub.levelHints?.[String(lvl.value)] && (
                        <span className="text-gray-500">{sub.levelHints[String(lvl.value)]}</span>
                      )}
                    </span>
                  </label>
                ))}
                {rubric.notAssessedLabel && (
                  <label className="flex items-start gap-2 rounded-md border border-gray-100 p-2 text-xs text-gray-500 hover:bg-gray-50">
                    <input
                      type="radio"
                      name={`level_${sub.key}`}
                      value={NOT_ASSESSED}
                      required
                      defaultChecked={hasSavedEvaluation && existingLevels[sub.key] === undefined}
                      className="mt-0.5"
                    />
                    <span className="font-medium">{rubric.notAssessedLabel}</span>
                  </label>
                )}
              </div>
            </div>
          ))}
        </div>
      ))}

      <div>
        <label htmlFor="overallComments" className="block text-sm font-medium text-gray-700">
          Overall comments
        </label>
        <textarea
          id="overallComments"
          name="overallComments"
          rows={4}
          defaultValue={initialOverallComments}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base"
        />
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          name="intent"
          value="draft"
          disabled={isPending}
          className="rounded-md border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 disabled:opacity-60"
        >
          Save draft
        </button>
        <button
          type="submit"
          name="intent"
          value="final"
          disabled={isPending}
          className="rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
        >
          Mark as final
        </button>
      </div>
    </form>
  );
}
