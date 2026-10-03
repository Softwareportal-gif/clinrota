import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireRole } from "@/lib/require-role";
import { getCoordinatorProfileByUserId } from "@/lib/coordinator";
import { getStudentRecordData } from "@/lib/student-record";
import { StudentRecordDocument } from "./StudentRecordDocument";

// @react-pdf/renderer renders with a real PDF layout engine (Yoga), not a
// headless browser — but it still needs Node APIs (fontkit, Buffer), so
// this route can't run on the Edge runtime.
export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireRole("COORDINATOR");
  const coordinatorProfile = await getCoordinatorProfileByUserId(session.user.id);

  const data = await getStudentRecordData(id);
  if (!data || data.student.programId !== coordinatorProfile.programId) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const buffer = await renderToBuffer(StudentRecordDocument({ data }));
  const fileName = `${data.student.studentIdNumber}-rotation-summary.pdf`;

  // Buffer is a valid Blob/Response-body part at runtime in Node, but TS's
  // DOM lib types BlobPart/BodyInit against plain ArrayBuffer, not Node's
  // ArrayBufferLike-backed Buffer (which also permits SharedArrayBuffer) —
  // a well-known type-only mismatch, not a real incompatibility.
  const body = new Blob([buffer as unknown as BlobPart], { type: "application/pdf" });

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
