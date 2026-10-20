// The ward a logbook case happened on. Students choose it first when they
// log a case: one of the site's wards (its SiteDepartment names, set by the
// coordinator) or one they type in. Stored as plain text on LogEntry.wardName.

export const WARD_NAME_MAX = 80;

// Trimmed, single-spaced and capped; null when nothing usable was given.
export function normalizeWardName(value: string | null | undefined): string | null {
  const name = (value ?? "").replace(/\s+/g, " ").trim().slice(0, WARD_NAME_MAX);
  return name || null;
}

// A site's wards for the picker: tidied, de-duplicated (ignoring case) and sorted.
export function wardOptions(names: string[]): string[] {
  const seen = new Map<string, string>();
  for (const raw of names) {
    const name = normalizeWardName(raw);
    if (name && !seen.has(name.toLowerCase())) seen.set(name.toLowerCase(), name);
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

// New wards typed by a coordinator (comma- or line-separated), tidied, minus
// any the site already has or that repeat (ignoring case).
export function newWardNames(input: string, existing: string[]): string[] {
  const taken = new Set(existing.map((n) => n.toLowerCase()));
  const out: string[] = [];
  for (const raw of input.split(/[,\n]/)) {
    const name = normalizeWardName(raw);
    if (name && !taken.has(name.toLowerCase())) {
      taken.add(name.toLowerCase());
      out.push(name);
    }
  }
  return out;
}
