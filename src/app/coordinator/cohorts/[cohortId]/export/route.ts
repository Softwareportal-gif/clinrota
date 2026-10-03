import { NextResponse } from "next/server";
import { requireRole } from "@/lib/require-role";
import { getCoordinatorProfileByUserId } from "@/lib/coordinator";
import { prisma } from "@/lib/prisma";
import { getStudentCoverage } from "@/lib/student-coverage";
import { getRotationHours } from "@/lib/rotation-hours";
import { getEffectiveDocStatus, isCompliant } from "@/lib/compliance-status";
import { buildCsv } from "@/lib/csv";

// One row per student. Each student is represented by their single most
// recently-started rotation — a student with more than one rotation over
// time will only appear once, scored against their latest placement, since
// this export is meant to answer "how is this cohort doing right now,"
// not a full rotation-by-rotation history (that's what the per-student PDF
// and the Unified Student Record page are for).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ cohortId: string }> }
) {
  const { cohortId } = await params;
  const session = await requireRole("COORDINATOR");
  const coordinatorProfile = await getCoordinatorProfileByUserId(session.user.id);

  const cohort = await prisma.cohort.findUnique({ where: { id: cohortId } });
  if (!cohort || cohort.programId !== coordinatorProfile.programId) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const students = await prisma.studentProfile.findMany({
    where: { programId: coordinatorProfile.programId, cohortId },
    include: {
      user: true,
      rotations: {
        include: {
          clinicalSite: true,
          program: { select: { defaultMinHours: true } },
          rotationScore: true,
        },
        orderBy: { startDate: "desc" },
        take: 1,
      },
    },
    orderBy: { user: { name: "asc" } },
  });

  const requiredTypes = await prisma.requiredDocumentType.findMany({
    where: { programId: coordinatorProfile.programId, isActive: true },
  });

  // Sequential, not Promise.all across students — see the same rationale
  // in src/lib/student-record.ts.
  const rows = [];
  for (const student of students) {
    const rotation = student.rotations[0] ?? null;
    const coverage = await getStudentCoverage(student.id, coordinatorProfile.programId);
    const docs = await prisma.complianceDocument.findMany({ where: { studentId: student.id } });
    const hours = rotation ? await getRotationHours(rotation) : null;
    const docByType = new Map(docs.map((d) => [d.requiredDocumentTypeId, d]));
    const compliantCount = requiredTypes.filter((t) =>
      isCompliant(getEffectiveDocStatus(docByType.get(t.id)))
    ).length;

    rows.push([
      student.user.name,
      student.studentIdNumber,
      rotation?.clinicalSite.name ?? "",
      rotation?.rotationScore ? rotation.rotationScore.finalScore.toFixed(1) : "",
      rotation?.rotationScore ? (rotation.rotationScore.passed ? "Pass" : "Fail") : "",
      hours ? hours.completedHours.toFixed(1) : "",
      hours?.requiredHours ?? "",
      coverage.percent !== null ? coverage.percent.toFixed(1) : "",
      requiredTypes.length > 0 ? `${compliantCount}/${requiredTypes.length}` : "",
    ]);
  }

  const csv = buildCsv(
    [
      "Student Name",
      "Student ID",
      "Current Site",
      "Final Score (%)",
      "Pass/Fail",
      "Hours Completed",
      "Hours Required",
      "Competency Coverage (%)",
      "Compliance (verified/required)",
    ],
    rows
  );

  const fileName = `${cohort.name}-${cohort.academicYear}-${cohort.term}-roster.csv`.replace(/\s+/g, "_");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
