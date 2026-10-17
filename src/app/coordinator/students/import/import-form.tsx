"use client";

import { useState } from "react";
import Link from "next/link";
import Papa from "papaparse";
import { validateImportRows, confirmImport, createImportCohorts, type ConfirmImportResult } from "./actions";
import type { RawStudentRow, StudentRowResult } from "@/lib/student-import";

type Phase = "empty" | "parsed" | "validating" | "validated" | "importing" | "imported";
type CohortDefaults = { academicYear: string; term: string; startDate: string; endDate: string };

// Spreadsheets arrive with "First Name", "first_name", "Level", "Cohort",
// "Student ID"… — compare headers with case, spaces, underscores, dots and
// hyphens removed.
const HEADER_ALIASES: Record<keyof RawStudentRow, string[]> = {
  firstName: ["firstname", "givenname", "othernames"],
  lastName: ["lastname", "surname", "familyname"],
  email: ["email", "emailaddress"],
  cohort: ["level", "cohort", "yearlevel", "class"],
  studentId: ["studentid", "studentidnumber", "idnumber", "indexnumber", "matricnumber", "studentnumber"],
};
const normalizeHeader = (h: string) => h.toLowerCase().replace(/[\s_.-]/g, "");

function toRawRow(r: Record<string, string>): RawStudentRow {
  const byHeader = new Map(Object.entries(r).map(([k, v]) => [normalizeHeader(k), v ?? ""]));
  const pick = (field: keyof RawStudentRow) =>
    HEADER_ALIASES[field].map((alias) => byHeader.get(alias)).find((v) => v !== undefined) ?? "";
  return {
    firstName: pick("firstName"),
    lastName: pick("lastName"),
    email: pick("email"),
    cohort: pick("cohort"),
    studentId: pick("studentId"),
  };
}

const levelInputClass = "mt-1 block w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-base sm:text-sm";

export function ImportForm({ cohortDefaults }: { cohortDefaults: CohortDefaults }) {
  const [phase, setPhase] = useState<Phase>("empty");
  const [fileName, setFileName] = useState("");
  const [rawRows, setRawRows] = useState<RawStudentRow[]>([]);
  const [results, setResults] = useState<StudentRowResult[]>([]);
  const [importResult, setImportResult] = useState<ConfirmImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creatingLevels, setCreatingLevels] = useState(false);
  const [levelError, setLevelError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setImportResult(null);
    setFileName(file.name);

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (parsed) => {
        const rows: RawStudentRow[] = parsed.data.map(toRawRow);
        setRawRows(rows);
        setResults([]);
        setPhase("parsed");
        // Validation runs automatically right after the client-side parse
        // (no separate button) — it's read-only against the server, so
        // there's nothing to confirm before doing it.
        await validate(rows);
      },
      error: () => {
        setError("Couldn't parse that file — make sure it's a valid CSV.");
      },
    });
  }

  async function validate(rows: RawStudentRow[]) {
    setPhase("validating");
    try {
      setResults(await validateImportRows(rows));
      setPhase("validated");
    } catch {
      setError("Couldn't validate this file — try again.");
      setPhase("parsed");
    }
  }

  // Levels the file mentions that the program doesn't have yet, with how
  // many rows are waiting on each.
  // Grouped ignoring case ("Level 400" and "level 400" are one level),
  // named by the first spelling with a capital letter, else capitalised.
  const missingLevels = [
    ...results
      .filter((r) => r.status === "missing_cohort")
      .reduce((m, r) => {
        const key = r.data.cohort.toLowerCase();
        const entry = m.get(key) ?? { name: r.data.cohort, count: 0 };
        if (entry.name === entry.name.toLowerCase() && r.data.cohort !== r.data.cohort.toLowerCase()) {
          entry.name = r.data.cohort;
        }
        entry.count += 1;
        return m.set(key, entry);
      }, new Map<string, { name: string; count: number }>())
      .values(),
  ].map(({ name, count }): [string, number] => [
    name === name.toLowerCase() ? name.replace(/\b\p{Ll}/gu, (c) => c.toUpperCase()) : name,
    count,
  ]);

  async function handleCreateLevels(formData: FormData) {
    setCreatingLevels(true);
    setLevelError(null);
    const result = await createImportCohorts(
      missingLevels.map(([name]) => name),
      {
        academicYear: String(formData.get("academicYear") ?? ""),
        term: String(formData.get("term") ?? ""),
        startDate: String(formData.get("startDate") ?? ""),
        endDate: String(formData.get("endDate") ?? ""),
      }
    );
    setCreatingLevels(false);
    if (!result.ok) {
      setLevelError(result.error);
      return;
    }
    await validate(rawRows);
  }

  async function handleConfirm() {
    setPhase("importing");
    setError(null);
    const validRows = results.filter((r) => r.status === "valid").map((r) => r.data);
    try {
      const result = await confirmImport(validRows, fileName, results.length);
      setImportResult(result);
      if (!result.ok) setError(result.error);
      setPhase("imported");
    } catch {
      setError("Import failed — try again.");
      setPhase("validated");
    }
  }

  const validCount = results.filter((r) => r.status === "valid").length;
  const errorCount = results.filter((r) => r.status === "error").length;
  const waitingCount = results.filter((r) => r.status === "missing_cohort").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        {/* A CSV download, not a page — a plain link, so the browser saves the file. */}
        <a
          href="/coordinator/students/import/template"
          download
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
        >
          Download template
        </a>
        <label className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white cursor-pointer">
          Choose CSV file
          <input
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />
        </label>
        {fileName && <span className="text-sm text-gray-500">{fileName}</span>}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {phase === "validating" && <p className="text-sm text-gray-500">Validating…</p>}

      {(phase === "validated" || phase === "importing" || phase === "imported") &&
        results.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm text-gray-700">
              {validCount} of {results.length} rows are ready to import
              {waitingCount > 0 ? ` · ${waitingCount} waiting for a level to be created` : ""}
              {errorCount > 0 ? ` · ${errorCount} ${errorCount === 1 ? "row needs" : "rows need"} fixing` : ""}.
            </p>

            {missingLevels.length > 0 && phase !== "imported" && (
              <form
                action={handleCreateLevels}
                className="space-y-3 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
              >
                <p className="font-medium">
                  {missingLevels.length === 1 ? "This level doesn't" : "These levels don't"} exist in your program yet:
                </p>
                <ul className="list-disc pl-5">
                  {missingLevels.map(([name, count]) => (
                    <li key={name}>
                      {name} ({count} student{count === 1 ? "" : "s"})
                    </li>
                  ))}
                </ul>
                <p>
                  Create {missingLevels.length === 1 ? "it" : "them"} for this term, and those rows will be ready to
                  import:
                </p>
                <div className="grid gap-3 sm:grid-cols-4">
                  <label className="block">
                    <span className="text-xs font-medium">Academic year</span>
                    <input name="academicYear" required defaultValue={cohortDefaults.academicYear} className={levelInputClass} />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium">Term</span>
                    <input name="term" required defaultValue={cohortDefaults.term} className={levelInputClass} />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium">Start date</span>
                    <input name="startDate" type="date" required defaultValue={cohortDefaults.startDate} className={levelInputClass} />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium">End date</span>
                    <input name="endDate" type="date" required defaultValue={cohortDefaults.endDate} className={levelInputClass} />
                  </label>
                </div>
                {levelError && <p className="text-red-700">{levelError}</p>}
                <button
                  type="submit"
                  disabled={creatingLevels}
                  className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-60"
                >
                  {creatingLevels ? "Creating…" : `Create ${missingLevels.map(([name]) => name).join(", ")}`}
                </button>
              </form>
            )}
            <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead>
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Row</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Name</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Email</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Student ID</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Level</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {results.map((r) => (
                    <tr
                      key={r.row}
                      className={
                        r.status === "error" ? "bg-red-50" : r.status === "missing_cohort" ? "bg-amber-50" : "bg-green-50/40"
                      }
                    >
                      <td className="px-3 py-2 text-gray-500">{r.row}</td>
                      <td className="px-3 py-2 text-gray-900">
                        {r.data.firstName} {r.data.lastName}
                      </td>
                      <td className="px-3 py-2 text-gray-700">{r.data.email}</td>
                      <td className="px-3 py-2 text-gray-700">
                        {r.data.studentId || <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-3 py-2 text-gray-700">{r.data.cohort}</td>
                      <td className="px-3 py-2">
                        {r.status === "valid" ? (
                          <span className="text-green-700">Ready</span>
                        ) : r.status === "missing_cohort" ? (
                          <span className="text-amber-700">{r.errorMessage}</span>
                        ) : (
                          <span className="text-red-700">{r.errorMessage}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {phase !== "imported" && validCount > 0 && (
              <button
                type="button"
                disabled={phase === "importing"}
                onClick={handleConfirm}
                className="rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
              >
                {phase === "importing" ? "Importing…" : `Confirm import (${validCount} students)`}
              </button>
            )}
          </div>
        )}

      {phase === "imported" && importResult?.ok && (
        <div className="space-y-2 rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          <p>
            Imported {importResult.successCount} of {importResult.totalRows} rows
            {importResult.errorCount > 0 ? ` (${importResult.errorCount} excluded)` : ""}.
          </p>
          <p>No invitations have been sent yet — that&apos;s a separate step.</p>
          <Link href="/coordinator/students" className="font-medium text-blue-600 hover:underline">
            Go to student roster to send invitations →
          </Link>
        </div>
      )}
    </div>
  );
}
