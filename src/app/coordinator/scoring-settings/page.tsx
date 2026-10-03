import { requireRole } from "@/lib/require-role";
import { getCoordinatorProfileByUserId } from "@/lib/coordinator";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "@/components/dashboard-header";
import {
  DEFAULT_SUPERVISOR_WEIGHT,
  DEFAULT_LOGBOOK_WEIGHT,
  DEFAULT_PASS_THRESHOLD,
} from "@/lib/scoring";
import { ScoringSettingsForm } from "./scoring-settings-form";

export default async function ScoringSettingsPage() {
  const session = await requireRole("COORDINATOR");
  const coordinatorProfile = await getCoordinatorProfileByUserId(session.user.id);

  const config = await prisma.scoringConfig.findUnique({
    where: { programId: coordinatorProfile.programId },
  });

  return (
    <main className="min-h-screen bg-gray-50">
      <DashboardHeader title="Scoring settings" userName={session.user.name ?? ""} />
      <div className="mx-auto max-w-2xl space-y-4 px-6 py-8">
        <p className="text-sm text-gray-500">Program: {coordinatorProfile.program.name}</p>
        <ScoringSettingsForm
          initialSupervisorPercent={Math.round(
            (config?.supervisorWeight ?? DEFAULT_SUPERVISOR_WEIGHT) * 100
          )}
          initialLogbookPercent={Math.round(
            (config?.logbookWeight ?? DEFAULT_LOGBOOK_WEIGHT) * 100
          )}
          initialPassThreshold={config?.passThreshold ?? DEFAULT_PASS_THRESHOLD}
        />
      </div>
    </main>
  );
}
