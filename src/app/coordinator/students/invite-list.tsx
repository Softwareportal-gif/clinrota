"use client";

import { useState } from "react";
import Link from "next/link";
import { sendInvitations, type SendInvitationsResult } from "./actions";
import { StudentIdCell } from "./student-id-cell";

type Row = {
  userId: string;
  studentProfileId: string;
  studentIdNumber: string;
  name: string;
  email: string;
  status: "IMPORTED" | "INVITED";
  cohortName: string | null;
};

export function InviteList({ rows }: { rows: Row[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, setIsPending] = useState(false);
  const [result, setResult] = useState<SendInvitationsResult | null>(null);

  const allSelected = rows.length > 0 && selected.size === rows.length;

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.userId)));
  }

  async function handleSend() {
    setIsPending(true);
    setResult(null);
    const outcome = await sendInvitations([...selected]);
    setResult(outcome);
    setSelected(new Set());
    setIsPending(false);
  }

  if (rows.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        No imported or invited students right now.{" "}
        <Link href="/coordinator/students/import" className="text-blue-600 hover:underline">
          Import a CSV
        </Link>{" "}
        to add some.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {result && (
        <div className="space-y-1 rounded-md border border-gray-200 bg-white p-4 text-sm">
          {result.sent.length > 0 && (
            <p className="text-green-700">Sent {result.sent.length} invitation(s).</p>
          )}
          {result.failed.length > 0 && (
            <div className="text-red-700">
              <p>{result.failed.length} invitation(s) failed to send — still marked as imported:</p>
              <ul className="ml-4 list-disc">
                {result.failed.map((f) => (
                  <li key={f.id}>
                    {f.name}: {f.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={allSelected} onChange={toggleAll} />
          Select all imported/invited
        </label>
        <button
          type="button"
          disabled={selected.size === 0 || isPending}
          onClick={handleSend}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {isPending ? "Sending…" : `Send invitations (${selected.size})`}
        </button>
      </div>

      <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead>
            <tr>
              <th className="px-3 py-2" />
              <th className="px-3 py-2 text-left font-medium text-gray-700">Name</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">Student ID</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">Email</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">Cohort</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r) => (
              <tr key={r.userId}>
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selected.has(r.userId)}
                    onChange={() => toggle(r.userId)}
                  />
                </td>
                <td className="px-3 py-2 text-gray-900">{r.name}</td>
                <td className="px-3 py-2">
                  <StudentIdCell studentProfileId={r.studentProfileId} initialValue={r.studentIdNumber} />
                </td>
                <td className="px-3 py-2 text-gray-700">{r.email}</td>
                <td className="px-3 py-2 text-gray-700">{r.cohortName ?? "—"}</td>
                <td className="px-3 py-2">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      r.status === "INVITED"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {r.status === "INVITED" ? "Invited" : "Imported"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
