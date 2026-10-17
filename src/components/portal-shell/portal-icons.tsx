// Line icons for the portal sidebars (24px grid, stroke follows
// currentColor so the nav link's text colour drives them).
type IconProps = { className?: string };

function Svg({ className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

export const PORTAL_ICONS = {
  home: (p: IconProps) => (
    <Svg {...p}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </Svg>
  ),
  users: (p: IconProps) => (
    <Svg {...p}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18.5 20a6.5 6.5 0 0 0-3-5.5" />
    </Svg>
  ),
  calendar: (p: IconProps) => (
    <Svg {...p}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </Svg>
  ),
  target: (p: IconProps) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="0.8" />
    </Svg>
  ),
  shield: (p: IconProps) => (
    <Svg {...p}>
      <path d="M12 3 4.5 6v5.5c0 4.5 3.2 8.2 7.5 9.5 4.3-1.3 7.5-5 7.5-9.5V6L12 3Z" />
      <path d="m8.8 12 2.3 2.3 4.1-4.6" />
    </Svg>
  ),
  building: (p: IconProps) => (
    <Svg {...p}>
      <path d="M4 21V5.5L12 3l8 2.5V21" />
      <path d="M2.5 21h19M9 21v-4h6v4M8.5 8h1M14.5 8h1M8.5 12h1M14.5 12h1" />
    </Svg>
  ),
  sliders: (p: IconProps) => (
    <Svg {...p}>
      <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="10" cy="17" r="2" />
    </Svg>
  ),
  list: (p: IconProps) => (
    <Svg {...p}>
      <path d="M9 6.5h11M9 12h11M9 17.5h11" />
      <circle cx="4.5" cy="6.5" r="1" />
      <circle cx="4.5" cy="12" r="1" />
      <circle cx="4.5" cy="17.5" r="1" />
    </Svg>
  ),
  file: (p: IconProps) => (
    <Svg {...p}>
      <path d="M14 3H6.5A1.5 1.5 0 0 0 5 4.5v15A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V8l-5-5Z" />
      <path d="M14 3v5h5M8.5 13h7M8.5 17h5" />
    </Svg>
  ),
  inbox: (p: IconProps) => (
    <Svg {...p}>
      <path d="M3.5 13.5 6 5h12l2.5 8.5V19a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19v-5.5Z" />
      <path d="M3.5 13.5h5l1.5 2.5h4l1.5-2.5h5" />
    </Svg>
  ),
  clock: (p: IconProps) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </Svg>
  ),
  clipboard: (p: IconProps) => (
    <Svg {...p}>
      <rect x="5" y="4.5" width="14" height="16.5" rx="2" />
      <path d="M9 4.5V3h6v1.5M8.5 11h7M8.5 15h5" />
    </Svg>
  ),
  layers: (p: IconProps) => (
    <Svg {...p}>
      <path d="m12 3 9 4.5-9 4.5-9-4.5L12 3Z" />
      <path d="m3 12 9 4.5 9-4.5M3 16.5 12 21l9-4.5" />
    </Svg>
  ),
  ticket: (p: IconProps) => (
    <Svg {...p}>
      <path d="M3.5 8.5V6A1.5 1.5 0 0 1 5 4.5h14A1.5 1.5 0 0 1 20.5 6v2.5a3.5 3.5 0 0 0 0 7V18a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18v-2.5a3.5 3.5 0 0 0 0-7Z" />
      <path d="M14 4.5v15" strokeDasharray="2 2.5" />
    </Svg>
  ),
  help: (p: IconProps) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.6 9.3a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.2-2.4 3.8M12 17h.01" />
    </Svg>
  ),
} satisfies Record<string, (p: IconProps) => React.ReactNode>;

export type PortalIconName = keyof typeof PORTAL_ICONS;
