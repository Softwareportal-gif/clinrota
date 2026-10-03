import { NextResponse } from "next/server";
import { requireRole } from "@/lib/require-role";
import { buildCsv } from "@/lib/csv";

export async function GET() {
  await requireRole("COORDINATOR");

  const csv = buildCsv(
    ["firstName", "lastName", "email", "cohort"],
    [["Ama", "Serwaa", "ama.serwaa@example.com", "Level 300"]]
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="student-import-template.csv"',
    },
  });
}
