import { requireRole } from "@/lib/require-role";
import { getStudentProfileByUserId } from "@/lib/student";
import { DARK_GREEN, TEXT_SECONDARY, BORDER } from "../dashboard-sections/colors";
import { ProfileEditForm } from "./profile-edit-form";

export default async function StudentProfilePage() {
  const session = await requireRole("STUDENT");
  const studentProfile = await getStudentProfileByUserId(session.user.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold" style={{ color: DARK_GREEN }}>My Profile</h1>
        <p className="mt-1 text-sm" style={{ color: TEXT_SECONDARY }}>
          Keep your details up to date so coordinators and preceptors can reach you.
        </p>
      </div>

      <section className="rounded-2xl bg-white p-6" style={{ border: `1px solid ${BORDER}` }}>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs" style={{ color: TEXT_SECONDARY }}>Name</dt>
            <dd style={{ color: "#1E2A27" }}>{session.user.name}</dd>
          </div>
          <div>
            <dt className="text-xs" style={{ color: TEXT_SECONDARY }}>Student ID</dt>
            <dd style={{ color: "#1E2A27" }}>{studentProfile.studentIdNumber}</dd>
          </div>
          <div>
            <dt className="text-xs" style={{ color: TEXT_SECONDARY }}>Program</dt>
            <dd style={{ color: "#1E2A27" }}>{studentProfile.program.name}</dd>
          </div>
          <div>
            <dt className="text-xs" style={{ color: TEXT_SECONDARY }}>Email</dt>
            <dd className="truncate" style={{ color: "#1E2A27" }}>{session.user.email}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl bg-white p-6" style={{ border: `1px solid ${BORDER}` }}>
        <h2 className="text-base font-bold" style={{ color: DARK_GREEN }}>Additional details</h2>
        <div className="mt-4">
          <ProfileEditForm
            phone={studentProfile.phone}
            areasOfInterest={studentProfile.areasOfInterest}
            personalStatement={studentProfile.personalStatement}
          />
        </div>
      </section>
    </div>
  );
}
