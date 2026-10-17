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
  // Optional guidance for the item as a whole (e.g. the observable
  // evidence a published tool lists for it), shown under its label.
  description?: string;
};

export type DimensionDef = {
  key: string;
  label: string;
  subDimensions: SubDimensionDef[];
  // Relative weight of this dimension's average in the overall score, for
  // tools that weight their sections (MTCCP: 60/40). When no dimension has
  // a weight, the overall score is the plain average of every rating.
  weight?: number;
  // Recorded but not part of the overall score — for a tool's separate
  // global judgement (e.g. AMSAT's global rating scale), which would
  // otherwise double-count the items it summarises.
  excludeFromScore?: boolean;
};

export type RubricDefinition = {
  scaleLevels: ScaleLevel[];
  dimensions: DimensionDef[];
  // When set, a supervisor may mark an item with this label instead of a
  // level (AMSAT's "Not assessed", Mini-CEX's "Not observed"); no rating is
  // stored for it and it's left out of every average.
  notAssessedLabel?: string;
  // Attribution for a published instrument, shown wherever it's used —
  // required by the Creative Commons licences several of them use.
  source?: string;
};

// Form value for an item marked with the rubric's notAssessedLabel.
export const NOT_ASSESSED = "NA";

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
// Seeded by prisma/migrations/20261017020000_validated_evaluation_tools.
export const AMSAT_TEMPLATE_ID = "00000000-0000-0000-0000-000000000007";

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

// An evaluation's overall 0-100 score under its rubric's own rules:
// dimensions marked excludeFromScore are ignored, and when dimensions carry
// weights the score is the weighted average of each dimension's average
// (dimensions with nothing rated drop out and the rest are re-weighted).
// Without weights this is exactly averageRatingPercent over the scored
// ratings, so rubrics that predate weights score as they always did.
export function rubricPercent(
  ratings: { dimension: string; level: number }[],
  rubric: RubricDefinition
): number | null {
  const scored = rubric.dimensions.filter((d) => !d.excludeFromScore);
  const scoredKeys = new Set(scored.map((d) => d.key));
  // Ratings under a dimension the rubric no longer defines still count, as
  // they did before dimensions could be excluded.
  const known = new Set(rubric.dimensions.map((d) => d.key));
  const counted = ratings.filter((r) => scoredKeys.has(r.dimension) || !known.has(r.dimension));

  if (!scored.some((d) => d.weight !== undefined)) {
    return averageRatingPercent(counted, rubric.scaleLevels);
  }

  let weightedSum = 0;
  let totalWeight = 0;
  for (const d of scored) {
    const avg = averageRatingPercent(
      counted.filter((r) => r.dimension === d.key),
      rubric.scaleLevels
    );
    if (avg === null) continue;
    const weight = d.weight ?? 0;
    weightedSum += avg * weight;
    totalWeight += weight;
  }
  return totalWeight > 0 ? weightedSum / totalWeight : null;
}
