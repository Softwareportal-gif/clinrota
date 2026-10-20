import type { RotationStatus } from "@/generated/prisma/client";
import { rotationPhaseLabel } from "@/lib/rotation-status";

const STYLES: Record<RotationStatus, string> = {
  ACTIVE: "bg-green-50 text-green-700",
  SCHEDULED: "bg-blue-50 text-blue-700",
  COMPLETED: "bg-gray-100 text-gray-700",
  CANCELLED: "bg-red-50 text-red-700",
};

export function PhasePill({ phase }: { phase: RotationStatus }) {
  return <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${STYLES[phase]}`}>{rotationPhaseLabel(phase)}</span>;
}
