"use client";

import { useActionState } from "react";
import { createSite, updateSite } from "./actions";

type Site = {
  name: string;
  location: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  mouStartDate: Date | null;
  mouEndDate: Date | null;
  maxStudentCapacity: number | null;
  mouDocumentUrl: string | null;
};

function toDateInputValue(date: Date | null): string {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

export function SiteForm({ site, siteId }: { site?: Site; siteId?: string }) {
  const action = siteId ? updateSite.bind(null, siteId) : createSite;
  const [state, formAction, isPending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="max-w-lg space-y-5">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Site name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={site?.name}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base"
        />
      </div>

      <div>
        <label htmlFor="location" className="block text-sm font-medium text-gray-700">
          Location
        </label>
        <input
          id="location"
          name="location"
          type="text"
          defaultValue={site?.location ?? ""}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="contactName" className="block text-sm font-medium text-gray-700">
            Contact name
          </label>
          <input
            id="contactName"
            name="contactName"
            type="text"
            defaultValue={site?.contactName ?? ""}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base"
          />
        </div>
        <div>
          <label htmlFor="contactPhone" className="block text-sm font-medium text-gray-700">
            Contact phone
          </label>
          <input
            id="contactPhone"
            name="contactPhone"
            type="text"
            defaultValue={site?.contactPhone ?? ""}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base"
          />
        </div>
      </div>

      <div>
        <label htmlFor="contactEmail" className="block text-sm font-medium text-gray-700">
          Contact email
        </label>
        <input
          id="contactEmail"
          name="contactEmail"
          type="email"
          defaultValue={site?.contactEmail ?? ""}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base"
        />
      </div>

      <fieldset className="space-y-4 rounded-md border border-gray-200 p-4">
        <legend className="px-1 text-sm font-medium text-gray-700">Affiliation agreement (MOU)</legend>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="mouStartDate" className="block text-xs text-gray-600">
              Contract start date
            </label>
            <input
              id="mouStartDate"
              name="mouStartDate"
              type="date"
              defaultValue={toDateInputValue(site?.mouStartDate ?? null)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label htmlFor="mouEndDate" className="block text-xs text-gray-600">
              Contract end date
            </label>
            <input
              id="mouEndDate"
              name="mouEndDate"
              type="date"
              defaultValue={toDateInputValue(site?.mouEndDate ?? null)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            />
          </div>
        </div>
        <div>
          <label htmlFor="mouDocument" className="block text-xs text-gray-600">
            MOU document (PDF, JPG, or PNG)
          </label>
          {site?.mouDocumentUrl && (
            <p className="mt-1 text-xs text-gray-500">
              Current:{" "}
              <a
                href={site.mouDocumentUrl}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline"
              >
                view file
              </a>
            </p>
          )}
          <input
            id="mouDocument"
            name="mouDocument"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="mt-1 block w-full text-sm"
          />
        </div>
      </fieldset>

      <div>
        <label htmlFor="maxStudentCapacity" className="block text-sm font-medium text-gray-700">
          Max student capacity
        </label>
        <input
          id="maxStudentCapacity"
          name="maxStudentCapacity"
          type="number"
          min={0}
          defaultValue={site?.maxStudentCapacity ?? undefined}
          className="mt-1 block w-40 rounded-md border border-gray-300 px-3 py-2 text-base"
        />
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
      >
        {isPending ? "Saving..." : siteId ? "Save changes" : "Create site"}
      </button>
    </form>
  );
}
