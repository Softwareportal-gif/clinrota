import { prisma } from "@/lib/prisma";

export type RotationHours = {
  completedHours: number;
  requiredHours: number | null; // null when neither the rotation nor its program set a requirement
};

// A rotation's required hours come from Rotation.minHoursOverride, falling
// back to the program-wide Program.defaultMinHours — see the schema
// comment on Rotation.minHoursOverride. Only APPROVED timesheet entries
// count toward "completed," matching how the rest of the app (supervisor
// dashboard) treats pending hours as not-yet-credited.
export async function getRotationHours(rotation: {
  id: string;
  minHoursOverride: number | null;
  program: { defaultMinHours: number | null };
}): Promise<RotationHours> {
  const approved = await prisma.timesheetEntry.aggregate({
    where: { rotationId: rotation.id, status: "APPROVED" },
    _sum: { hours: true },
  });

  return {
    completedHours: approved._sum.hours ?? 0,
    requiredHours: rotation.minHoursOverride ?? rotation.program.defaultMinHours,
  };
}
