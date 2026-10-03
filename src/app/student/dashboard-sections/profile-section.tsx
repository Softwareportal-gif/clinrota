import Link from "next/link";
import { DARK_GREEN, TEAL, CORAL, TEXT_SECONDARY, BORDER } from "./colors";

export function ProfileSection({
  name,
  programName,
  cohortLabel,
  phone,
  areasOfInterest,
  personalStatement,
}: {
  name: string;
  programName: string;
  cohortLabel: string | null;
  phone: string | null;
  areasOfInterest: string | null;
  personalStatement: string | null;
}) {
  const initial = name.trim().charAt(0).toUpperCase() || "S";
  const fields = [phone, areasOfInterest, personalStatement];
  const filledCount = fields.filter((f) => f && f.trim().length > 0).length;
  const percent = Math.round((filledCount / fields.length) * 100);

  return (
    <section className="flex flex-col gap-4 rounded-2xl bg-white p-6 sm:flex-row sm:items-center sm:gap-6" style={{ border: `1px solid ${BORDER}` }}>
      <div className="flex items-center gap-4">
        <div
          className="flex h-13 w-13 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white"
          style={{ backgroundColor: CORAL, width: 52, height: 52 }}
        >
          {initial}
        </div>
        <div>
          <p className="text-sm font-bold" style={{ color: "#1E2A27" }}>{name}</p>
          <p className="text-xs" style={{ color: TEXT_SECONDARY }}>
            {cohortLabel ? `${cohortLabel} · ${programName}` : programName}
          </p>
        </div>
      </div>

      <div className="flex-1">
        <div className="flex items-center justify-between text-xs" style={{ color: TEXT_SECONDARY }}>
          <span>Profile completeness</span>
          <span className="font-semibold" style={{ color: DARK_GREEN }}>{percent}%</span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full" style={{ background: "#E9E4D8" }}>
          <div className="h-full rounded-full" style={{ width: `${percent}%`, background: TEAL }} />
        </div>
      </div>

      <Link href="/student/profile" className="shrink-0 text-sm font-semibold" style={{ color: TEAL }}>
        Finish your profile →
      </Link>
    </section>
  );
}
