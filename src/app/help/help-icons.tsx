// Icons for the /help page's Quick Links panel — same outline-line-art
// language as the landing page's icon sets (48-unit viewBox, stroke-width
// 3, round caps), single-color via a `color` prop.

export function PlayIcon({ className, color = "#0A3F38" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <circle cx="24" cy="24" r="19" fill="none" stroke={color} strokeWidth="3" />
      <path d="M19,15 L33,24 L19,33 Z" fill={color} />
    </svg>
  );
}

export function TicketIcon({ className, color = "#0A3F38" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path
        d="M6,17 C6,14.8 7.8,13 10,13 L38,13 C40.2,13 42,14.8 42,17 L42,20 C39.8,20 38,21.8 38,24 C38,26.2 39.8,28 42,28 L42,31 C42,33.2 40.2,35 38,35 L10,35 C7.8,35 6,33.2 6,31 L6,28 C8.2,28 10,26.2 10,24 C10,21.8 8.2,20 6,20 Z"
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <line x1="24" y1="16" x2="24" y2="32" stroke={color} strokeWidth="3" strokeDasharray="4 4" strokeLinecap="round" />
    </svg>
  );
}
