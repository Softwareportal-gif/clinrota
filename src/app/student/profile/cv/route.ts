import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireRole } from "@/lib/require-role";
import { getStudentProfileByUserId } from "@/lib/student";
import { getStudentCvData } from "@/lib/student-cv";
import { StudentCvDocument } from "./cv-document";

// @react-pdf/renderer needs Node APIs (fontkit, Buffer) — not Edge-compatible.
export const runtime = "nodejs";

// No id in the URL on purpose: a student can only ever download their own CV.
export async function GET() {
  const session = await requireRole("STUDENT");
  const studentProfile = await getStudentProfileByUserId(session.user.id);
  const data = await getStudentCvData(studentProfile.id);
  if (!data) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const buffer = await renderToBuffer(StudentCvDocument({ data }));
  const safeName = data.name.normalize("NFKD").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "") || "student";

  // Same Buffer→BlobPart type-only cast as the coordinator PDF export route.
  const body = new Blob([buffer as unknown as BlobPart], { type: "application/pdf" });
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeName}-CV.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
