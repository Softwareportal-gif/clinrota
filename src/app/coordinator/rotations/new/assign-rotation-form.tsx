"use client";

import { useState, useActionState } from "react";
import { assignRotation } from "./actions";
import type { SiteContractStatus } from "@/lib/site-status";

type StudentRow = { id: string; name: string; hasIssue: boolean; issueTypeNames: string[] };
type SiteRow = {
  id: string;
  name: string;
  status: SiteContractStatus;
  departments: { id: string; name: string }[];
};
type SupervisorRow = { id: string; name: string };

export function AssignRotationForm({
  students,
  sites,
  supervisors,
}: {
  students: StudentRow[];
  sites: SiteRow[];
  supervisors: SupervisorRow[];
}) {
  const [studentId, setStudentId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [state, formAction, isPending] = useActionState(assignRotation, undefined);

  const student = students.find((s) => s.id === studentId);
  const site = sites.find((s) => s.id === siteId);
  const siteHasIssue = site ? site.status === "EXPIRED" || site.status === "EXPIRING_SOON" : false;
  const hasWarning = !!student?.hasIssue || siteHasIssue;

  return (
    <form action={formAction} className="max-w-lg space-y-5">
      <div>
        <label htmlFor="studentId" className="block text-sm font-medium text-gray-700">
          Student
        </label>
        <select
          id="studentId"
          name="studentId"
          required
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base"
        >
          <option value="">Select a student</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
              {s.hasIssue ? " (compliance issue)" : ""}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="clinicalSiteId" className="block text-sm font-medium text-gray-700">
          Clinical site
        </label>
        <select
          id="clinicalSiteId"
          name="clinicalSiteId"
          required
          value={siteId}
          onChange={(e) => setSiteId(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base"
        >
          <option value="">Select a site</option>
          {sites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
              {s.status === "EXPIRED" ? " (contract expired)" : s.status === "EXPIRING_SOON" ? " (contract expiring soon)" : ""}
            </option>
          ))}
        </select>
      </div>

      {site && site.departments.length > 0 && (
        <div>
          <label htmlFor="siteDepartmentId" className="block text-sm font-medium text-gray-700">
            Department (optional)
          </label>
          <select
            id="siteDepartmentId"
            name="siteDepartmentId"
            defaultValue=""
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base"
          >
            <option value="">No specific department</option>
            {site.departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label htmlFor="supervisorId" className="block text-sm font-medium text-gray-700">
          Supervisor
        </label>
        <select
          id="supervisorId"
          name="supervisorId"
          required
          defaultValue=""
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base"
        >
          <option value="" disabled>
            Select a supervisor
          </option>
          {supervisors.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
            Start date
          </label>
          <input
            id="startDate"
            name="startDate"
            type="date"
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base"
          />
        </div>
        <div>
          <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
            End date
          </label>
          <input
            id="endDate"
            name="endDate"
            type="date"
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base"
          />
        </div>
      </div>

      {hasWarning && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-medium">Heads up before assigning:</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {student?.hasIssue && (
              <li>
                {student.name} has a non-compliant document: {student.issueTypeNames.join(", ")}
              </li>
            )}
            {siteHasIssue && site && (
              <li>
                {site.name}&apos;s affiliation contract is{" "}
                {site.status === "EXPIRED" ? "expired" : "expiring soon"}.
              </li>
            )}
          </ul>
          <label className="mt-3 flex items-center gap-2">
            <input type="checkbox" name="acknowledgeWarning" required />
            I understand and want to proceed anyway
          </label>
          <div className="mt-2">
            <label htmlFor="overrideReason" className="block text-xs text-amber-700">
              Reason for proceeding (required)
            </label>
            <textarea
              id="overrideReason"
              name="overrideReason"
              rows={2}
              required
              className="mt-1 block w-full rounded-md border border-amber-300 px-2 py-1.5 text-sm"
            />
          </div>
        </div>
      )}

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
      >
        {isPending ? "Assigning..." : "Assign rotation"}
      </button>
    </form>
  );
}
