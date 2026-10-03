import { requireRole } from "@/lib/require-role";
import { getStudentProfileByUserId } from "@/lib/student";
import { getPlacementSummaries } from "@/lib/placement-summary";
import { DARK_GREEN, TEXT_SECONDARY } from "../dashboard-sections/colors";
import { MyPlacementsSection } from "../dashboard-sections/my-placements-section";

export default async function StudentPlacementsPage() {
  const session = await requireRole("STUDENT");
  const studentProfile = await getStudentProfileByUserId(session.user.id);
  const placements = await getPlacementSummaries(studentProfile.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold" style={{ color: DARK_GREEN }}>My Placements</h1>
        <p className="mt-1 text-sm" style={{ color: TEXT_SECONDARY }}>
          Every rotation you&apos;ve been assigned, with your to-do progress for each.
        </p>
      </div>

      <MyPlacementsSection placements={placements} showHeading={false} />
    </div>
  );
}
