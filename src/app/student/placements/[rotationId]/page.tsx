import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/require-role";
import { getStudentProfileByUserId } from "@/lib/student";
import { getPlacementSummaries } from "@/lib/placement-summary";
import { DARK_GREEN, TEAL, TEXT_SECONDARY, BORDER, STATUS_GREEN, STATUS_AMBER } from "../../dashboard-sections/colors";

function fmtDate(d: Date) {
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default async function PlacementDetailPage({
  params,
}: {
  params: Promise<{ rotationId: string }>;
}) {
  const { rotationId } = await params;
  const session = await requireRole("STUDENT");
  const studentProfile = await getStudentProfileByUserId(session.user.id);
  const placements = await getPlacementSummaries(studentProfile.id);
  const placement = placements.find((p) => p.id === rotationId);
  if (!placement) notFound();

  const doneCount = placement.checklist.filter((c) => c.done).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/student/placements" className="text-xs font-semibold" style={{ color: TEAL }}>
          ← Back to placements
        </Link>
        <h1 className="mt-2 text-xl font-bold" style={{ color: DARK_GREEN }}>
          {placement.siteName}
          {placement.departmentName ? ` — ${placement.departmentName}` : ""}
        </h1>
        <p className="mt-1 text-sm" style={{ color: TEXT_SECONDARY }}>
          {fmtDate(placement.startDate)} – {fmtDate(placement.endDate)} · {placement.preceptorName}
        </p>
      </div>

      <section className="rounded-2xl bg-white p-6" style={{ border: `1px solid ${BORDER}` }}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold" style={{ color: DARK_GREEN }}>To-do list</h2>
          <span className="text-sm font-semibold" style={{ color: TEXT_SECONDARY }}>
            {doneCount} of {placement.checklist.length} done
          </span>
        </div>

        <ul className="mt-4 space-y-2">
          {placement.checklist.map((item) => (
            <li
              key={item.label}
              className="flex items-center justify-between gap-3 rounded-xl px-4 py-3"
              style={{ border: `1px solid ${BORDER}` }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: item.done ? STATUS_GREEN : STATUS_AMBER }}
                  aria-hidden="true"
                />
                <span className="text-sm" style={{ color: "#1E2A27", fontWeight: item.done ? 400 : 600 }}>
                  {item.label}
                </span>
                <span className="text-xs" style={{ color: item.done ? STATUS_GREEN : STATUS_AMBER }}>
                  {item.done ? "Complete" : "Pending"}
                </span>
              </div>
              {!item.done && (
                <Link href={item.actionHref} className="shrink-0 text-xs font-semibold" style={{ color: TEAL }}>
                  {item.actionLabel}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
