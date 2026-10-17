"use client";

import { useMemo, useState, useActionState } from "react";
import { assignRotations } from "./actions";
import type { SiteContractStatus } from "@/lib/site-status";

type StudentRow = {
  id: string;
  name: string;
  studentIdNumber: string;
  cohortId: string | null;
  cohortName: string | null;
  hasIssue: boolean;
  issueTypeNames: string[];
};
type CohortOption = { id: string; label: string };
type SiteRow = {
  id: string;
  name: string;
  status: SiteContractStatus;
  departments: { id: string; name: string }[];
};
type SupervisorRow = { id: string; name: string };

const NO_COHORT = "__none__";
const selectClass = "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base sm:text-sm";

export function AssignRotationForm({
  students,
  cohorts,
  sites,
  supervisors,
}: {
  students: StudentRow[];
  cohorts: CohortOption[];
  sites: SiteRow[];
  supervisors: SupervisorRow[];
}) {
  const [cohortFilter, setCohortFilter] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [siteId, setSiteId] = useState("");
  const [state, formAction, isPending] = useActionState(assignRotations, undefined);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students.filter((s) => {
      if (cohortFilter === NO_COHORT ? s.cohortId !== null : cohortFilter && s.cohortId !== cohortFilter) return false;
      return !q || `${s.name} ${s.studentIdNumber}`.toLowerCase().includes(q);
    });
  }, [students, cohortFilter, query]);

  const allShownSelected = shown.length > 0 && shown.every((s) => selected.has(s.id));
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAllShown = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      for (const s of shown) {
        if (allShownSelected) next.delete(s.id);
        else next.add(s.id);
      }
      return next;
    });

  const selectedStudents = students.filter((s) => selected.has(s.id));
  const studentsWithIssues = selectedStudents.filter((s) => s.hasIssue);
  const site = sites.find((s) => s.id === siteId);
  const siteHasIssue = site ? site.status === "EXPIRED" || site.status === "EXPIRING_SOON" : false;
  const hasWarning = studentsWithIssues.length > 0 || siteHasIssue;
  const count = selected.size;

  return (
    <form action={formAction} className="space-y-6">
      {[...selected].map((id) => (
        <input key={id} type="hidden" name="studentIds" value={id} />
      ))}

      <fieldset className="rounded-md border border-gray-200 bg-white">
        <legend className="sr-only">Students</legend>
        <div className="space-y-3 border-b border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-700">1. Choose students</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="cohortFilter" className="block text-xs font-medium text-gray-500">
                Level
              </label>
              <select
                id="cohortFilter"
                value={cohortFilter}
                onChange={(e) => setCohortFilter(e.target.value)}
                className={selectClass}
              >
                <option value="">All levels</option>
                {cohorts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
                {students.some((s) => s.cohortId === null) && <option value={NO_COHORT}>No level</option>}
              </select>
            </div>
            <div>
              <label htmlFor="studentSearch" className="block text-xs font-medium text-gray-500">
                Search
              </label>
              <input
                id="studentSearch"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Name or student ID"
                className={selectClass}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <label className="flex items-center gap-2 font-medium text-gray-700">
              <input type="checkbox" checked={allShownSelected} onChange={toggleAllShown} disabled={shown.length === 0} />
              Select all {shown.length} shown
            </label>
            <span className="text-gray-500">
              {count} selected
              {count > 0 && (
                <button type="button" onClick={() => setSelected(new Set())} className="ml-2 font-medium text-blue-600 hover:underline">
                  Clear
                </button>
              )}
            </span>
          </div>
        </div>
        <ul className="max-h-80 divide-y divide-gray-100 overflow-y-auto">
          {shown.map((s) => (
            <li key={s.id}>
              <label className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-gray-50">
                <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-gray-900">{s.name}</span>
                  <span className="block truncate text-xs text-gray-500">
                    {s.studentIdNumber} · {s.cohortName ?? "No level"}
                  </span>
                </span>
                {s.hasIssue && (
                  <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                    Compliance issue
                  </span>
                )}
              </label>
            </li>
          ))}
          {shown.length === 0 && <li className="px-4 py-6 text-center text-sm text-gray-500">No students match.</li>}
        </ul>
      </fieldset>

      <fieldset className="space-y-5 rounded-md border border-gray-200 bg-white p-4">
        <legend className="sr-only">Placement</legend>
        <p className="text-sm font-medium text-gray-700">2. Placement details</p>
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
            className={selectClass}
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
            <select id="siteDepartmentId" name="siteDepartmentId" defaultValue="" className={selectClass}>
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
          <select id="supervisorId" name="supervisorId" required defaultValue="" className={selectClass}>
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
            <input id="startDate" name="startDate" type="date" required className={selectClass} />
          </div>
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
              End date
            </label>
            <input id="endDate" name="endDate" type="date" required className={selectClass} />
          </div>
        </div>
      </fieldset>

      {hasWarning && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-medium">Heads up before assigning:</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {studentsWithIssues.slice(0, 5).map((s) => (
              <li key={s.id}>
                {s.name} has a non-compliant document: {s.issueTypeNames.join(", ")}
              </li>
            ))}
            {studentsWithIssues.length > 5 && (
              <li>…and {studentsWithIssues.length - 5} more students with compliance issues</li>
            )}
            {siteHasIssue && site && (
              <li>
                {site.name}&apos;s affiliation contract is {site.status === "EXPIRED" ? "expired" : "expiring soon"}.
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
        disabled={isPending || count === 0}
        className="rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
      >
        {isPending
          ? "Assigning…"
          : count === 0
            ? "Select students to assign"
            : `Assign rotation to ${count} student${count === 1 ? "" : "s"}`}
      </button>
    </form>
  );
}
