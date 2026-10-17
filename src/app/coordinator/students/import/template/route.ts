import { NextResponse } from "next/server";
import { requireRole } from "@/lib/require-role";
import { buildCsv } from "@/lib/csv";

export async function GET() {
  await requireRole("COORDINATOR");

  // One file can hold every level; studentId is optional.
  const csv = buildCsv(
    ["firstName", "lastName", "email", "studentId", "level"],
    [
      ["Ama", "Serwaa", "ama.serwaa@example.com", "PT/2026/001", "Level 100"],
      ["Kofi", "Mensah", "kofi.mensah@example.com", "PT/2025/014", "Level 200"],
      ["Esi", "Ofori", "esi.ofori@example.com", "", "Level 300"],
    ]
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="student-import-template.csv"',
    },
  });
}
