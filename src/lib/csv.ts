// Minimal RFC 4180-style CSV encoding — hand-rolled rather than pulling in
// a dependency for something this small. A field is quoted only when it
// contains a comma, quote, or newline; embedded quotes are doubled.
function toCsvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function toCsvRow(fields: (string | number | null | undefined)[]): string {
  return fields.map(toCsvField).join(",");
}

export function buildCsv(header: string[], rows: (string | number | null | undefined)[][]): string {
  // Leading ﻿ (BOM) so Excel reliably detects UTF-8 instead of
  // guessing a legacy codepage and mangling non-ASCII names.
  return "﻿" + [toCsvRow(header), ...rows.map(toCsvRow)].join("\r\n") + "\r\n";
}
