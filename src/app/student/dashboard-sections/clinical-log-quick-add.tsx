import Link from "next/link";
import type { PlacementSummary } from "@/lib/placement-summary";
import { INK, ACCENT, TEXT_SECONDARY, BORDER } from "./colors";

export function ClinicalLogQuickAdd({
  hasActiveRotation,
  activeRotation,
}: {
  hasActiveRotation: boolean;
  activeRotation: PlacementSummary | null;
}) {
  const today = new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

  return (
    <section className="rounded-2xl bg-white p-6" style={{ border: `1px solid ${BORDER}` }}>
      <h2 className="text-base font-bold" style={{ color: INK }}>
        Log a Clinical Encounter
      </h2>
      <p className="mt-1 text-xs" style={{ color: TEXT_SECONDARY }}>
        {activeRotation ? `Active rotation: ${activeRotation.siteName}` : "No active rotation yet"}
      </p>

      <div className="mt-4 space-y-2.5">
        <div className="rounded-lg px-3 py-2.5" style={{ background: "#F8F7FC", border: `1px solid ${BORDER}` }}>
          <p className="text-[11px]" style={{ color: TEXT_SECONDARY }}>Date of visit</p>
          <p className="text-sm" style={{ color: "#17153B" }}>{today}</p>
        </div>
        <div className="rounded-lg px-3 py-2.5" style={{ background: "#F8F7FC", border: `1px solid ${BORDER}` }}>
          <p className="text-[11px]" style={{ color: TEXT_SECONDARY }}>Preceptor</p>
          <p className="text-sm" style={{ color: "#17153B" }}>{activeRotation?.preceptorName ?? "—"}</p>
        </div>
      </div>

      {hasActiveRotation ? (
        <Link
          href="/student/log/new"
          className="mt-4 block w-full rounded-lg px-4 py-2.5 text-center text-sm font-semibold text-white"
          style={{ backgroundColor: ACCENT }}
        >
          Start a new log entry
        </Link>
      ) : (
        <p className="mt-4 text-xs" style={{ color: TEXT_SECONDARY }}>
          You&apos;ll be able to log cases once you have an active rotation.
        </p>
      )}
    </section>
  );
}
