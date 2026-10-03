// ClinRota's mark: a teal circle with a white checkmark whose upstroke
// carries a single heartbeat/EKG blip — "verified" and "clinical" in one
// shape. Kept as a plain inline SVG component (not a raster asset) so it
// scales cleanly from a 16px favicon-equivalent up to a large hero mark.
// The circle's original brand teal (#0E6F63) is kept as-is across palette
// changes elsewhere on the page — it reads comfortably against the deep
// teal nav bar since they're in the same color family.
export function Logo({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="100" cy="100" r="94" fill="#0E6F63" />
      <path
        d="M50,110 L78,138 L105,109 L111,116 L120,88 L129,112 L133,101 L155,55"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="14"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
