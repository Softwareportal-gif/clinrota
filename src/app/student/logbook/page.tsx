import Link from "next/link";
import { requireRole } from "@/lib/require-role";
import { getStudentProfileByUserId } from "@/lib/student";
import { prisma } from "@/lib/prisma";
import { LogbookList } from "./logbook-list";
import { INK, ACCENT, TEXT_SECONDARY } from "../dashboard-sections/colors";

export default async function LogbookPage() {
  const session = await requireRole("STUDENT");
  const studentProfile = await getStudentProfileByUserId(session.user.id);

  const entries = await prisma.logEntry.findMany({
    where: { studentId: studentProfile.id },
    include: { rotation: { include: { clinicalSite: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: INK }}>My Logbook</h1>
          <p className="mt-1 text-sm" style={{ color: TEXT_SECONDARY }}>
            {entries.length} case{entries.length === 1 ? "" : "s"} logged
          </p>
        </div>
        <Link
          href="/student/log/new"
          className="rounded-md px-4 py-2 text-sm font-semibold text-white"
          style={{ backgroundColor: ACCENT }}
        >
          + Log a case
        </Link>
      </div>

      <LogbookList
        serverEntries={entries.map((e) => ({
          id: e.id,
          caseTitle: e.caseTitle,
          status: e.status,
          occurredAt: e.occurredAt,
          clinicalSiteName: e.rotation.clinicalSite.name,
        }))}
        userId={session.user.id}
      />
    </div>
  );
}
