"use client";

import { useActionState } from "react";
import { uploadComplianceDocument } from "./actions";

export function UploadForm({
  requiredDocumentTypeId,
  buttonLabel,
}: {
  requiredDocumentTypeId: string;
  buttonLabel: string;
}) {
  const action = uploadComplianceDocument.bind(null, requiredDocumentTypeId);
  const [state, formAction, isPending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="mt-3 space-y-3 rounded-md border border-gray-100 bg-gray-50 p-3">
      <div>
        <label className="block text-xs font-medium text-gray-600">File (PDF, JPG, or PNG)</label>
        <input
          type="file"
          name="file"
          accept=".pdf,.jpg,.jpeg,.png"
          required
          className="mt-1 block w-full text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600">Issue date</label>
          <input
            type="date"
            name="issueDate"
            className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600">Expiry date</label>
          <input
            type="date"
            name="expiryDate"
            className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
      </div>
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
      {state?.success && <p className="text-xs text-green-600">Uploaded — awaiting verification.</p>}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
      >
        {isPending ? "Uploading..." : buttonLabel}
      </button>
    </form>
  );
}
