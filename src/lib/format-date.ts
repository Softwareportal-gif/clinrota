// One way to show dates across the portals: "1 Oct 2026" and, with a time,
// "1 Oct 2026, 14:05" — day first, as read in Ghana, never the ambiguous
// 10/1/2026. Always in UTC (Ghana's own time zone), and spelled out here
// rather than by the browser's locale data (which says "Sep" in some
// places and "Sept" in others), so the server and every browser print the
// same text and pages never flicker on load.

type DateLike = Date | string | number | null | undefined;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n: number) => String(n).padStart(2, "0");

function toDate(value: DateLike): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(value: DateLike): string {
  const d = toDate(value);
  return d ? `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}` : "—";
}

export function formatDateTime(value: DateLike): string {
  const d = toDate(value);
  return d ? `${formatDate(d)}, ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}` : "—";
}

export function formatDateRange(start: DateLike, end: DateLike): string {
  return `${formatDate(start)} – ${formatDate(end)}`;
}

// For <input type="date"> defaults, and CSV exports.
export function toDateInputValue(value: DateLike): string {
  const d = toDate(value);
  return d ? d.toISOString().slice(0, 10) : "";
}
