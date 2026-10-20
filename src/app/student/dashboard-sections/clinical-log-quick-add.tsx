import Link from "next/link";
import type { PlacementSummary } from "@/lib/placement-summary";
import { INK, ACCENT, TEXT_SECONDARY, BORDER } from "./colors";

// Where the student's next case will be logged, as plain facts (not fields
// to fill in), with the button to start one.
export function ClinicalLogQuickAdd({
  hasActiveRotation,
  activeRotation,
}: {
  hasActiveRotation: boolean;
  activeRotation: PlacementSummary | null;
}) {
  const facts = activeRotation
    ? [
        { label: "Site", value: activeRotation.siteName },
        ...(activeRotation.departmentName ? [{ label: "Ward", value: activeRotation.departmentName }] : []),
        { label: "Supervisor", value: activeRotation.supervisorName },
      ]
    : [];

  return (
    <section className="rounded-2xl bg-white p-6" style={{ border: `1px solid ${BORDER}` }}>
      <h2 className="text-base font-bold" style={{ color: INK }}>
        Log a case
      </h2>
      <p className="mt-1 text-xs" style={{ color: TEXT_SECONDARY }}>
        {activeRotation ? "Your current rotation" : "No active rotation yet"}
      </p>

      {facts.length > 0 && (
        <dl className="mt-3 space-y-1.5 text-sm">
          {facts.map((f) => (
            <div key={f.label} className="flex justify-between gap-3">
              <dt style={{ color: TEXT_SECONDARY }}>{f.label}</dt>
              <dd className="text-right font-medium" style={{ color: "#17153B" }}>
                {f.value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {hasActiveRotation ? (
        <Link
          href="/student/log/new"
          className="mt-4 block w-full rounded-lg px-4 py-2.5 text-center text-sm font-semibold text-white"
          style={{ backgroundColor: ACCENT }}
        >
          Log a new case
        </Link>
      ) : (
        <p className="mt-4 text-xs" style={{ color: TEXT_SECONDARY }}>
          You&apos;ll be able to log cases once your rotation starts.
        </p>
      )}
    </section>
  );
}
