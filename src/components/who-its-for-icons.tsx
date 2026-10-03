import type { ReactNode } from "react";

// Discipline icons for the "Who it's for" cards — same outline-line-art
// language as how-it-works-icons.tsx (48-unit viewBox, stroke-width 3,
// round caps/joins) but single-color rather than teal+coral two-tone,
// since these need to mute to a lighter grey-teal as a whole for
// not-yet-onboarded disciplines (a `color` prop, not a baked-in palette).

function IconBase({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      {children}
    </svg>
  );
}

// Nursing — a stethoscope.
export function NurseIcon({ className, color }: { className?: string; color: string }) {
  return (
    <IconBase className={className}>
      <path
        d="M14,6 V20 C14,26 18,30 24,30 C30,30 34,26 34,20 V6"
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <line x1="14" y1="6" x2="14" y2="10" stroke={color} strokeWidth="3" strokeLinecap="round" />
      <line x1="34" y1="6" x2="34" y2="10" stroke={color} strokeWidth="3" strokeLinecap="round" />
      <line x1="24" y1="30" x2="24" y2="34" stroke={color} strokeWidth="3" strokeLinecap="round" />
      <circle cx="24" cy="39" r="5" fill="none" stroke={color} strokeWidth="3" />
    </IconBase>
  );
}

// Midwifery — a heart with a small pulse line, for care + vital signs.
export function MidwiferyIcon({ className, color }: { className?: string; color: string }) {
  return (
    <IconBase className={className}>
      <path
        d="M24,40 C10,30 6,21 6,15 C6,9 11,5 16,5 C20,5 23,7.5 24,11 C25,7.5 28,5 32,5 C37,5 42,9 42,15 C42,21 38,30 24,40 Z"
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M12,19 H18 L21,13 L26,25 L29,19 H36"
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </IconBase>
  );
}

// Medicine — a doctor's bag.
export function MedicineIcon({ className, color }: { className?: string; color: string }) {
  return (
    <IconBase className={className}>
      <path d="M17,13 V9 C17,7 18.5,5 21,5 H27 C29.5,5 31,7 31,9 V13" fill="none" stroke={color} strokeWidth="3" />
      <rect x="7" y="13" width="34" height="26" rx="4" fill="none" stroke={color} strokeWidth="3" />
      <line x1="24" y1="21" x2="24" y2="31" stroke={color} strokeWidth="3" strokeLinecap="round" />
      <line x1="19" y1="26" x2="29" y2="26" stroke={color} strokeWidth="3" strokeLinecap="round" />
    </IconBase>
  );
}

// Pharmacy — a capsule.
export function PharmacyIcon({ className, color }: { className?: string; color: string }) {
  return (
    <IconBase className={className}>
      <rect
        x="6"
        y="19"
        width="36"
        height="16"
        rx="8"
        transform="rotate(-35 24 27)"
        fill="none"
        stroke={color}
        strokeWidth="3"
      />
      <line
        x1="24"
        y1="14.5"
        x2="24"
        y2="39.5"
        transform="rotate(-35 24 27)"
        stroke={color}
        strokeWidth="3"
      />
    </IconBase>
  );
}

// Physiotherapy — a joint's range of motion, arc + directional arrow.
export function PhysiotherapyIcon({ className, color }: { className?: string; color: string }) {
  return (
    <IconBase className={className}>
      <path d="M10,34 L20,34 L20,22 L32,14" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="20" cy="22" r="2.5" fill={color} />
      <path
        d="M26,8 A14,14 0 0 1 36,20"
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path d="M36,20 L38,14 M36,20 L30,19" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </IconBase>
  );
}
