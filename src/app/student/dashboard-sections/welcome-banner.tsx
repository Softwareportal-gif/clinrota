import { HIGHLIGHT } from "./colors";

export function WelcomeBanner({
  name,
  cohortLabel,
  nudge,
  attentionCount,
}: {
  name: string;
  cohortLabel: string | null;
  nudge: string | null;
  attentionCount: number;
}) {
  const firstName = name.split(" ")[0];

  return (
    <div
      className="flex flex-col gap-4 rounded-2xl px-8 py-7 sm:flex-row sm:items-center sm:justify-between"
      style={{ background: "radial-gradient(ellipse at 100% 0%, rgba(63,208,201,.35), transparent 55%), linear-gradient(120deg, #5A3BF0, #2546C8 60%, #1E2F8F)" }}
    >
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-white/60">
          {cohortLabel ?? "Welcome"}
        </p>
        <h1 className="mt-1 text-xl font-bold text-white sm:text-2xl">Welcome back, {firstName}</h1>
        {nudge && <p className="mt-1 text-sm" style={{ color: "#DCD8FF" }}>{nudge}</p>}
      </div>
      {attentionCount > 0 && (
        <span
          className="inline-flex shrink-0 items-center gap-2 self-start rounded-full px-4 py-2 text-sm font-semibold text-white sm:self-auto"
          style={{ background: "rgba(255,255,255,0.14)" }}
        >
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: HIGHLIGHT }} aria-hidden="true" />
          {attentionCount} item{attentionCount === 1 ? "" : "s"} need{attentionCount === 1 ? "s" : ""} your attention
        </span>
      )}
    </div>
  );
}
