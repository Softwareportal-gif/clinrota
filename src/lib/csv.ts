// Minimal RFC 4180-style CSV encoding — hand-rolled rather than pulling in
// a dependency for something this small. A field is quoted only when it
// contains a comma, quote, or newline; embedded quotes are doubled.
// A cell starting with = + - @ (or a tab/carriage return) is run as a
// formula by Excel and Sheets, so a crafted name could execute in the
// coordinator's spreadsheet ("CSV injection"). A leading apostrophe makes
// it plain text. Numbers are written as-is.
const FORMULA_START = /^[=+\-@\t\r]/;

function toCsvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = typeof value === "string" && FORMULA_START.test(value) ? `'${value}` : String(value);
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
