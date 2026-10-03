import type { ReactNode } from "react";

// Four small line-icons for the "How it works" section, all built on the
// same pattern as the logo mark — an outline shape with a checkmark inside
// — so the icon system reads as one family rather than four unrelated
// pictograms. Stroke-based, deep-teal line work with a coral accent
// checkmark in each, matching the page's restrained accent usage.

const DEEP_TEAL = "#0A3F38";
const CORAL = "#E8734A";

function IconBase({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      {children}
    </svg>
  );
}

// SOAP-format logbook entry — a document with checklist-style lines.
export function SoapNoteIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <rect x="9" y="5" width="26" height="34" rx="3" fill="none" stroke={DEEP_TEAL} strokeWidth="3" />
      <line x1="14" y1="14" x2="30" y2="14" stroke={DEEP_TEAL} strokeWidth="3" strokeLinecap="round" />
      <line x1="14" y1="21" x2="30" y2="21" stroke={DEEP_TEAL} strokeWidth="3" strokeLinecap="round" />
      <line x1="14" y1="28" x2="26" y2="28" stroke={DEEP_TEAL} strokeWidth="3" strokeLinecap="round" />
      <path
        d="M14,35 L18,39 L26,31"
        fill="none"
        stroke={CORAL}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </IconBase>
  );
}

// Offline-first sync — signal strength resolving into a confirmed checkmark.
export function OfflineSyncIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <rect x="7" y="28" width="6" height="10" rx="1.5" fill={DEEP_TEAL} />
      <rect x="17" y="20" width="6" height="18" rx="1.5" fill={DEEP_TEAL} />
      <rect x="27" y="12" width="6" height="26" rx="1.5" fill={DEEP_TEAL} opacity="0.35" />
      <circle cx="34" cy="16" r="11" fill={CORAL} />
      <path
        d="M29,16 L33,20 L40,12"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </IconBase>
  );
}

// Supervisor sign-off — a certification badge/medal.
export function SignOffIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <circle cx="24" cy="19" r="14" fill="none" stroke={DEEP_TEAL} strokeWidth="3" />
      <path
        d="M17,19 L22,25 L32,13"
        fill="none"
        stroke={CORAL}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line x1="18" y1="31" x2="13" y2="43" stroke={DEEP_TEAL} strokeWidth="3" strokeLinecap="round" />
      <line x1="30" y1="31" x2="35" y2="43" stroke={DEEP_TEAL} strokeWidth="3" strokeLinecap="round" />
    </IconBase>
  );
}

// Compliance tracking — a shield.
export function ComplianceIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path
        d="M24,5 L39,11 V21 C39,31 33,38 24,43 C15,38 9,31 9,21 V11 Z"
        fill="none"
        stroke={DEEP_TEAL}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M17,22 L22,28 L32,16"
        fill="none"
        stroke={CORAL}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </IconBase>
  );
}
