import Link from "next/link";
import type { PlacementSummary } from "@/lib/placement-summary";
import { INK, ACCENT, TEXT_SECONDARY, BORDER } from "./colors";

export type { PlacementSummary as PlacementCardData } from "@/lib/placement-summary";

function fmtDate(d: Date) {
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  ACTIVE: { bg: "#E4F3EA", color: "#1F6B3D", label: "In progress" },
  SCHEDULED: { bg: "#FDF1DC", color: "#92620A", label: "Upcoming" },
  COMPLETED: { bg: "#F1F0F8", color: "#5E5C7A", label: "Completed" },
  CANCELLED: { bg: "#FBEAE8", color: "#B23B2E", label: "Cancelled" },
};

export function MyPlacementsSection({
  placements,
  limit,
  showHeading = true,
}: {
  placements: PlacementSummary[];
  limit?: number;
  showHeading?: boolean;
}) {
  const shown = limit ? placements.slice(0, limit) : placements;

  return (
    <section className="rounded-2xl bg-white p-6" style={{ border: `1px solid ${BORDER}` }}>
      {showHeading && (
        <h2 className="text-base font-bold" style={{ color: INK }}>
          My Placements
        </h2>
      )}

      {shown.length === 0 ? (
        <p className="mt-3 text-sm" style={{ color: TEXT_SECONDARY }}>
          No placements yet — your coordinator will assign your first rotation once it&apos;s scheduled.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {shown.map((p) => {
            const doneCount = p.checklist.filter((c) => c.done).length;
            const total = p.checklist.length;
            const percent = total === 0 ? 100 : (doneCount / total) * 100;
            const statusStyle = STATUS_STYLES[p.status] ?? STATUS_STYLES.COMPLETED;
            return (
              <div key={p.id} className="rounded-xl p-4" style={{ border: `1px solid ${BORDER}` }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold" style={{ color: "#17153B" }}>
                      {p.siteName}
                      {p.departmentName ? ` — ${p.departmentName}` : ""}
                    </p>
                    <p className="truncate text-xs" style={{ color: TEXT_SECONDARY }}>
                      {fmtDate(p.startDate)} – {fmtDate(p.endDate)} · {p.preceptorName}
                    </p>
                  </div>
                  <span
                    className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold"
                    style={{ background: statusStyle.bg, color: statusStyle.color }}
                  >
                    {statusStyle.label}
                  </span>
                </div>

                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full" style={{ background: "#E8E6F4" }}>
                  <div className="h-full rounded-full" style={{ width: `${percent}%`, background: ACCENT }} />
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs" style={{ color: TEXT_SECONDARY }}>
                    {doneCount} of {total} tasks done
                  </span>
                  <Link href={`/student/placements/${p.id}`} className="text-xs font-semibold" style={{ color: ACCENT }}>
                    View to-do list →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
