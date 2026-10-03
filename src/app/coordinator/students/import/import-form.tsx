"use client";

import { useState } from "react";
import Link from "next/link";
import Papa from "papaparse";
import { validateImportRows, confirmImport, type ConfirmImportResult } from "./actions";
import type { RawStudentRow, StudentRowResult } from "@/lib/student-import";

type Phase = "empty" | "parsed" | "validating" | "validated" | "importing" | "imported";

export function ImportForm() {
  const [phase, setPhase] = useState<Phase>("empty");
  const [fileName, setFileName] = useState("");
  const [rawRows, setRawRows] = useState<RawStudentRow[]>([]);
  const [results, setResults] = useState<StudentRowResult[]>([]);
  const [importResult, setImportResult] = useState<ConfirmImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setImportResult(null);
    setFileName(file.name);

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (parsed) => {
        const rows: RawStudentRow[] = parsed.data.map((r) => ({
          firstName: r.firstName ?? "",
          lastName: r.lastName ?? "",
          email: r.email ?? "",
          cohort: r.cohort ?? "",
        }));
        setRawRows(rows);
        setResults([]);
        setPhase("parsed");

        // Validation runs automatically right after the client-side parse
        // (no separate button) — it's read-only against the server, so
        // there's nothing to confirm before doing it.
        setPhase("validating");
        try {
          const validated = await validateImportRows(rows);
          setResults(validated);
          setPhase("validated");
        } catch {
          setError("Couldn't validate this file — try again.");
          setPhase("parsed");
        }
      },
      error: () => {
        setError("Couldn't parse that file — make sure it's a valid CSV.");
      },
    });
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <a
          href="/coordinator/students/import/template"
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
              {errorCount > 0 ? ` · ${errorCount} row${errorCount === 1 ? "" : "s"} need fixing` : ""}.
            </p>
            <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead>
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Row</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Name</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Email</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Cohort</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {results.map((r) => (
                    <tr key={r.row} className={r.status === "error" ? "bg-red-50" : "bg-green-50/40"}>
                      <td className="px-3 py-2 text-gray-500">{r.row}</td>
                      <td className="px-3 py-2 text-gray-900">
                        {r.data.firstName} {r.data.lastName}
                      </td>
                      <td className="px-3 py-2 text-gray-700">{r.data.email}</td>
                      <td className="px-3 py-2 text-gray-700">{r.data.cohort}</td>
                      <td className="px-3 py-2">
                        {r.status === "valid" ? (
                          <span className="text-green-700">Ready</span>
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
