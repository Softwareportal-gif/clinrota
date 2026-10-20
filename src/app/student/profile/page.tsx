import { requireRole } from "@/lib/require-role";
import { getStudentProfileByUserId } from "@/lib/student";
import { INK, ACCENT, TEXT_SECONDARY, BORDER } from "../dashboard-sections/colors";
import { ProfileEditForm } from "./profile-edit-form";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "My profile" };

export default async function StudentProfilePage() {
  const session = await requireRole("STUDENT");
  const studentProfile = await getStudentProfileByUserId(session.user.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold" style={{ color: INK }}>My Profile</h1>
        <p className="mt-1 text-sm" style={{ color: TEXT_SECONDARY }}>
          Keep your details up to date so coordinators and supervisors can reach you.
        </p>
      </div>

      <section className="rounded-2xl bg-white p-6" style={{ border: `1px solid ${BORDER}` }}>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs" style={{ color: TEXT_SECONDARY }}>Name</dt>
            <dd style={{ color: "#17153B" }}>{session.user.name}</dd>
          </div>
          <div>
            <dt className="text-xs" style={{ color: TEXT_SECONDARY }}>Student ID</dt>
            <dd style={{ color: "#17153B" }}>{studentProfile.studentIdNumber}</dd>
          </div>
          <div>
            <dt className="text-xs" style={{ color: TEXT_SECONDARY }}>Program</dt>
            <dd style={{ color: "#17153B" }}>{studentProfile.program.name}</dd>
          </div>
          <div>
            <dt className="text-xs" style={{ color: TEXT_SECONDARY }}>Email</dt>
            <dd className="truncate" style={{ color: "#17153B" }}>{session.user.email}</dd>
          </div>
        </dl>
      </section>

      <section
        id="cv"
        className="flex flex-col gap-4 rounded-2xl bg-white p-6 sm:flex-row sm:items-center sm:justify-between"
        style={{ border: `1px solid ${BORDER}` }}
      >
        <div>
          <h2 className="text-base font-bold" style={{ color: INK }}>Your CV</h2>
          <p className="mt-1 max-w-xl text-sm" style={{ color: TEXT_SECONDARY }}>
            A ready-to-send PDF built from your profile, placements, approved hours and the clinical skills
            your supervisors have signed off. Add a personal statement and areas of interest below to make
            it stronger.
          </p>
        </div>
        {/* Plain link, not next/link: it's a file download, not a page navigation. */}
        <a
          href="/student/profile/cv"
          download
          className="shrink-0 rounded-md px-4 py-2.5 text-center text-sm font-semibold text-white"
          style={{ backgroundColor: ACCENT }}
        >
          Download CV (PDF)
        </a>
      </section>

      <section className="rounded-2xl bg-white p-6" style={{ border: `1px solid ${BORDER}` }}>
        <h2 className="text-base font-bold" style={{ color: INK }}>Additional details</h2>
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
