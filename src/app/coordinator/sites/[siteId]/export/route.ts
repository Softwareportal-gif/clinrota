import { NextResponse } from "next/server";
import { requireRole } from "@/lib/require-role";
import { getCoordinatorProfileByUserId } from "@/lib/coordinator";
import { prisma } from "@/lib/prisma";
import { buildCsv } from "@/lib/csv";
import { rotationPhase, rotationPhaseLabel } from "@/lib/rotation-status";
import { toDateInputValue } from "@/lib/format-date";

// Every rotation at this site that overlaps the given [from, to] window
// (both optional — omitting either leaves that end of the range open).
// One row per rotation, not per student, since a student can be placed at
// the same site more than once across the range and each placement is a
// distinct data point for capacity/site-management purposes.
export async function GET(request: Request, { params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const session = await requireRole("COORDINATOR");
  const coordinatorProfile = await getCoordinatorProfileByUserId(session.user.id);

  const site = await prisma.clinicalSite.findUnique({ where: { id: siteId } });
  if (!site || site.institutionId !== coordinatorProfile.program.institutionId) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const rotations = await prisma.rotation.findMany({
    where: {
      clinicalSiteId: siteId,
      programId: coordinatorProfile.programId,
      ...(from ? { endDate: { gte: new Date(from) } } : {}),
      ...(to ? { startDate: { lte: new Date(to) } } : {}),
    },
    include: {
      student: { include: { user: true, program: true } },
      siteDepartment: true,
      supervisor: { include: { user: true } },
    },
    orderBy: { startDate: "asc" },
  });

  const rows = rotations.map((rotation) => [
    site.name,
    site.mouStartDate ? toDateInputValue(site.mouStartDate) : "",
    site.mouEndDate ? toDateInputValue(site.mouEndDate) : "",
    site.maxStudentCapacity ?? "",
    rotation.student.user.name,
    rotation.student.studentIdNumber,
    rotation.student.program.name,
    rotation.siteDepartment?.name ?? "",
    rotation.supervisor.user.name,
    toDateInputValue(rotation.startDate),
    toDateInputValue(rotation.endDate),
    rotationPhaseLabel(rotationPhase(rotation)),
  ]);

  const csv = buildCsv(
    [
      "Site Name",
      "Site MOU Start",
      "Site MOU End",
      "Site Max Capacity",
      "Student Name",
      "Student ID",
      "Program",
      "Department",
      "Supervisor",
      "Rotation Start",
      "Rotation End",
      "Rotation Status",
    ],
    rows
  );

  const fileName = `${site.name}-placements.csv`.replace(/\s+/g, "_");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
