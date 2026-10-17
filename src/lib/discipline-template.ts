// Generic types for a DisciplineTemplate's rubric + extra log fields, and
// the shared helpers that operate on them at read time (parsing the raw
// Json columns, flattening for rendering, converting a rating's level to a
// percentage). The Lasater rubric (src/lib/lcjr.ts) is just one instance of
// this shape, not special-cased here.

export type ScaleLevel = { value: number; label: string };

export type SubDimensionDef = {
  key: string;
  label: string;
  // Optional per-level guidance text shown next to that level's option in
  // the evaluation form. Keyed by the scale level's numeric value (as a
  // string, since it round-trips through JSON).
  levelHints?: Record<string, string>;
};

export type DimensionDef = {
  key: string;
  label: string;
  subDimensions: SubDimensionDef[];
};

export type RubricDefinition = {
  scaleLevels: ScaleLevel[];
  dimensions: DimensionDef[];
};

export type ExtraLogField = {
  key: string;
  label: string;
  type: "text" | "textarea";
};

// Fixed ids seeded by prisma/migrations/20260921000000_discipline_templates
// — kept here (not re-derived by name lookup) so app code and the seed
// script share one source of truth for "which row is which."
export const LCJR_TEMPLATE_ID = "00000000-0000-0000-0000-000000000001";
export const FALLBACK_TEMPLATE_ID = "00000000-0000-0000-0000-000000000002";

// DisciplineTemplate.rubric/extraLogFields are stored as Prisma `Json`,
// which types as `unknown` at the boundary — these just narrow that back
// to the shapes above. No runtime schema validation (the only writers are
// the migration and prisma/seed.ts, both trusted, and a future admin editor
// would need its own validation at the point of writing, not reading).
export function parseRubric(rubric: unknown): RubricDefinition {
  return rubric as RubricDefinition;
}

export function parseExtraLogFields(extraLogFields: unknown): ExtraLogField[] {
  return (extraLogFields as ExtraLogField[]) ?? [];
}

// A log entry's answers to its program's extra fields, labelled and in the
// template's order, for read-only views. Unanswered fields are left out;
// answers to fields a template no longer defines aren't shown.
export function answeredExtraFields(
  extraLogFields: unknown,
  extraFields: unknown
): { key: string; label: string; value: string }[] {
  const values = (extraFields ?? {}) as Record<string, unknown>;
  return parseExtraLogFields(extraLogFields).flatMap((f) => {
    const value = values[f.key];
    return typeof value === "string" && value.trim() ? [{ key: f.key, label: f.label, value }] : [];
  });
}

// Flattened list of every sub-dimension with its parent dimension attached
// — the template-driven replacement for lib/lcjr.ts's old fixed LCJR_FLAT.
export function flattenRubric(
  rubric: RubricDefinition
): { dimension: string; subDimension: string; label: string }[] {
  return rubric.dimensions.flatMap((d) =>
    d.subDimensions.map((s) => ({ dimension: d.key, subDimension: s.key, label: s.label }))
  );
}

// Converts a raw rating level to a 0-100 percentage, scaled against the
// template's own scale (so a 4-level LCJR rating and a 5-level entrustment
// rating both land on a comparable 0-100 range). Matches the original LCJR
// formula exactly (level / maxLevel * 100 — i.e. 1-4 maps to 25/50/75/100)
// so existing nursing scores are unaffected by this generalization.
export function levelToPercent(level: number, scaleLevels: ScaleLevel[]): number {
  const max = Math.max(...scaleLevels.map((s) => s.value));
  return (level / max) * 100;
}

// Average of a set of ratings' levels, converted to a 0-100 percentage —
// generalized from lib/lcjr.ts's old LCJR-only averageLcjrPercent to take
// the template's scale explicitly instead of assuming a fixed 1-4 range.
export function averageRatingPercent(
  ratings: { level: number }[],
  scaleLevels: ScaleLevel[]
): number | null {
  if (ratings.length === 0) return null;
  const sum = ratings.reduce((total, r) => total + levelToPercent(r.level, scaleLevels), 0);
  return sum / ratings.length;
}
