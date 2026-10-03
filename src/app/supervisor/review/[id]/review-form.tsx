"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitReviewCore } from "./actions";
import { submitWithFallback } from "@/lib/offline/submit-with-fallback";
import type { SubmitReviewPayload } from "@/lib/offline/payloads";
import type { EntrustmentLevel } from "@/generated/prisma/client";
import { ENTRUSTMENT_LEVEL_ORDER, ENTRUSTMENT_LEVEL_LABELS } from "@/lib/entrustment";

export function ReviewForm({
  logEntryId,
  studentReportedLevel,
  userId,
}: {
  logEntryId: string;
  studentReportedLevel: EntrustmentLevel;
  userId: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [queuedMessage, setQueuedMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setQueuedMessage(null);

    const form = e.currentTarget;
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const formData = new FormData(form);
    const intent = (submitter?.value ?? "") as "approve" | "reject" | "revise";
    if (!intent) return;

    setIsPending(true);
    const id = crypto.randomUUID();
    const payload: SubmitReviewPayload = {
      id,
      logEntryId,
      intent,
      comments: String(formData.get("comments") ?? ""),
      attested: formData.get("attested") === "on",
      supervisorAssessedRole: formData.get("supervisorAssessedRole") as EntrustmentLevel,
    };

    const outcome = await submitWithFallback({
      id,
      userId,
      opType: "submit-review",
      payload,
      action: () => submitReviewCore(payload),
    });

    setIsPending(false);

    if (outcome.synced) {
      if (outcome.result.error) {
        setError(outcome.result.error);
        return;
      }
      router.push("/supervisor");
      router.refresh();
    } else {
      setQueuedMessage(
        "You're offline — this decision is saved on this device and will sync automatically once you're back online."
      );
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-md border border-gray-200 bg-white p-4">
      <div>
        <label htmlFor="supervisorAssessedRole" className="block text-sm font-medium text-gray-700">
          Your assessed supervision level
        </label>
        <p className="mt-0.5 text-xs text-gray-500">
          Confirm or adjust the student&apos;s self-reported level — it&apos;s fine if you
          disagree.
        </p>
        <select
          id="supervisorAssessedRole"
          name="supervisorAssessedRole"
          defaultValue={studentReportedLevel}
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base"
        >
          {ENTRUSTMENT_LEVEL_ORDER.map((level) => (
            <option key={level} value={level}>
              {ENTRUSTMENT_LEVEL_LABELS[level]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="comments" className="block text-sm font-medium text-gray-700">
          Comments (required for reject / request revision)
        </label>
        <textarea
          id="comments"
          name="comments"
          rows={4}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" name="attested" />
        I attest this entry is accurate to the best of my knowledge
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {queuedMessage && <p className="text-sm text-amber-700">{queuedMessage}</p>}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          name="intent"
          value="approve"
          disabled={isPending}
          className="rounded-md bg-green-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
        >
          Approve
        </button>
        <button
          type="submit"
          name="intent"
          value="revise"
          disabled={isPending}
          className="rounded-md border border-amber-400 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-800 disabled:opacity-60"
        >
          Request revision
        </button>
        <button
          type="submit"
          name="intent"
          value="reject"
          disabled={isPending}
          className="rounded-md border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 disabled:opacity-60"
        >
          Reject
        </button>
      </div>
    </form>
  );
}
