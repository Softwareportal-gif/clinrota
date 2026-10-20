import { requireRole } from "@/lib/require-role";
import { getStudentProfileByUserId } from "@/lib/student";
import { prisma } from "@/lib/prisma";
import { NewCaseFlow } from "./new-case-flow";
import { parseExtraLogFields } from "@/lib/discipline-template";
import { wardOptions } from "@/lib/ward";
import { INK, TEXT_SECONDARY } from "../../dashboard-sections/colors";
import { loggableRotationWhere } from "@/lib/rotation-status";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Log a case" };

export default async function NewLogEntryPage() {
  const session = await requireRole("STUDENT");
  const studentProfile = await getStudentProfileByUserId(session.user.id);
  const extraLogFields = parseExtraLogFields(
    studentProfile.program.disciplineTemplate.extraLogFields
  );

  const [rotations, competencies] = await Promise.all([
    prisma.rotation.findMany({
      where: { studentId: studentProfile.id, ...loggableRotationWhere() },
      include: {
        clinicalSite: {
          include: {
            wardSupervisorEligibilities: { include: { supervisorProfile: { include: { user: true } } } },
            departments: { select: { name: true } },
          },
        },
        siteDepartment: true,
        supervisor: { include: { user: true } },
        wardAssignments: { where: { endedAt: null }, include: { wardSupervisor: { include: { user: true } } } },
        // The ward of this student's latest case here, to preselect next time.
        logEntries: { where: { wardName: { not: null } }, orderBy: { createdAt: "desc" }, take: 1, select: { wardName: true } },
      },
    }),
    prisma.competency.findMany({
      where: { programId: studentProfile.programId, isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const rotationWardInfo = rotations.map((r) => ({
    id: r.id,
    clinicalSite: { name: r.clinicalSite.name },
    siteDepartment: r.siteDepartment,
    supervisor: r.supervisor,
    wardSupervisionEnabled: r.clinicalSite.wardSupervisionEnabled,
    // Wards to choose from first: the site's wards, plus the last one used.
    wards: wardOptions([...r.clinicalSite.departments.map((d) => d.name), ...(r.logEntries[0]?.wardName ? [r.logEntries[0].wardName] : [])]),
    defaultWard: r.logEntries[0]?.wardName ?? r.siteDepartment?.name ?? "",
    eligibleWardSupervisors: r.clinicalSite.wardSupervisorEligibilities.map((e) => ({
      supervisorProfileId: e.supervisorProfileId,
      name: e.supervisorProfile.user.name,
    })),
    // Only ever one active row per rotation (enforced at the DB level).
    activeWardAssignment: r.wardAssignments[0]
      ? {
          id: r.wardAssignments[0].id,
          wardName: r.wardAssignments[0].wardName,
          wardSupervisorName: r.wardAssignments[0].wardSupervisor.user.name,
        }
      : null,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold" style={{ color: INK }}>Log a case</h1>
      </div>
      {rotations.length === 0 ? (
        <p className="text-sm" style={{ color: TEXT_SECONDARY }}>
          You have no active rotation to log a case against.
        </p>
      ) : (
        <NewCaseFlow
          rotations={rotationWardInfo}
          competencies={competencies}
          userId={session.user.id}
          extraLogFields={extraLogFields}
        />
      )}
    </div>
  );
}
