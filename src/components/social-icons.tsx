// Simple single-color glyphs for the footer's social row. Standard
// recognizable marks (not part of the "how it works"/"who it's for" line-
// art family, since these need to read at a small size inside a circular
// button rather than as a standalone illustration).

type IconProps = { className?: string; color?: string };

export function LinkedInIcon({ className, color = "currentColor" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path
        fill={color}
        d="M6.94 8.5H3.56V20.5H6.94V8.5ZM5.25 3.5C4.15 3.5 3.25 4.4 3.25 5.5C3.25 6.6 4.15 7.5 5.25 7.5C6.35 7.5 7.25 6.6 7.25 5.5C7.25 4.4 6.35 3.5 5.25 3.5ZM20.5 20.5V13.9C20.5 10.6 19.3 9 16.7 9C14.9 9 13.8 9.9 13.3 10.8V8.5H9.9C9.95 9.4 9.9 20.5 9.9 20.5H13.3V13.9C13.3 13.5 13.3 13.1 13.4 12.9C13.7 12.1 14.4 11.3 15.6 11.3C17.1 11.3 17.7 12.5 17.7 14.2V20.5H20.5Z"
      />
    </svg>
  );
}

export function FacebookIcon({ className, color = "currentColor" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path
        fill={color}
        d="M14.5 21V13.5H17L17.4 10.5H14.5V8.6C14.5 7.7 14.7 7.1 16 7.1H17.5V4.4C17 4.35 16.1 4.25 15.1 4.25C12.9 4.25 11.4 5.6 11.4 8.3V10.5H9V13.5H11.4V21H14.5Z"
      />
    </svg>
  );
}

export function InstagramIcon({ className, color = "currentColor" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" fill="none" stroke={color} strokeWidth="1.8" />
      <circle cx="12" cy="12" r="4.2" fill="none" stroke={color} strokeWidth="1.8" />
      <circle cx="16.9" cy="7.1" r="1.1" fill={color} />
    </svg>
  );
}

export function YouTubeIcon({ className, color = "currentColor" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <rect x="2.5" y="6" width="19" height="12" rx="4" fill="none" stroke={color} strokeWidth="1.8" />
      <path d="M10.3 9.3 L15.2 12 L10.3 14.7 Z" fill={color} />
    </svg>
  );
}
