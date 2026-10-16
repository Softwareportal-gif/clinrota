import { manrope } from "@/fonts/manrope";

// Manrope's capital height is ~72% of the font size; the drawn "P" matches
// it so the mark reads as the first letter of "Praxxt", not a separate icon.
const CAP_HEIGHT = 0.72;

const TONES = {
  onLight: { ink: "#17153B", stops: ["#5A3BF0", "#2563EB", "#12B5C9"] },
  onDark: { ink: "#FFFFFF", stops: ["#8B6BFF", "#4FA3FF", "#3FD0C9"] },
} as const;

export function Wordmark({
  size = 28,
  tone = "onLight",
  className,
}: {
  size?: number;
  tone?: keyof typeof TONES;
  className?: string;
}) {
  const { ink, stops } = TONES[tone];
  const gradientId = `praxxt-p-${tone}`;
  const markHeight = size * CAP_HEIGHT;

  return (
    <span
      role="img"
      aria-label="Praxxt"
      className={`${manrope.className} ${className ?? ""}`}
      style={{ fontSize: size, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1, color: ink, whiteSpace: "nowrap" }}
    >
      <svg
        width={(markHeight * 50) / 60}
        height={markHeight}
        viewBox="0 0 50 60"
        aria-hidden="true"
        // Negative: Manrope's "r" has a wide left side-bearing of its own.
        // verticalAlign overrides Tailwind preflight's `svg { vertical-align: middle }`,
        // which otherwise drops the P ~0.09em below the text baseline.
        style={{ display: "inline-block", verticalAlign: "baseline", marginRight: size * -0.02 }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={stops[0]} />
            <stop offset="0.55" stopColor={stops[1]} />
            <stop offset="1" stopColor={stops[2]} />
          </linearGradient>
        </defs>
        {/* Bowl first, tucked under the stem, so the join has no hairline seam. */}
        <path d="M12 7H26a16 16 0 0 1 0 32H12" stroke={`url(#${gradientId})`} strokeWidth="14" fill="none" />
        <path d="M7 0V60" stroke={ink} strokeWidth="14" fill="none" />
      </svg>
      raxxt
    </span>
  );
}
