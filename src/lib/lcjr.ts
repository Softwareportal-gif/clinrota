// Lasater Clinical Judgment Rubric (LCJR) structure — 4 dimensions, 11
// sub-dimensions, each scored on a 4-level scale. The level *names* below
// (Beginning/Developing/Accomplished/Exemplary) and the dimension/
// sub-dimension names are the LCJR's well-known public structure (Lasater,
// 2007). The short level descriptions are this app's own original
// paraphrase for in-app guidance — not verbatim rubric text — since the
// published rubric's full cell-by-cell wording is copyrighted. Refer to the
// original publication for the official criteria.
//
// This is now the seed content for the "Lasater (Nursing/Midwifery)"
// DisciplineTemplate row (see prisma/migrations/20260921000000_discipline_
// templates) rather than something the evaluation form reads directly —
// dimension/sub-dimension keys are plain strings, not Prisma enums, since a
// different template can define its own. See src/lib/discipline-template.ts
// for the generic types/helpers (RubricDefinition, levelToPercent, etc.)
// that actually drive rendering and scoring now.
export const LCJR_LEVELS = [
  { value: 1, label: "Beginning" },
  { value: 2, label: "Developing" },
  { value: 3, label: "Accomplished" },
  { value: 4, label: "Exemplary" },
] as const;

export type LcjrLevelValue = (typeof LCJR_LEVELS)[number]["value"];

type SubDimensionDef = {
  key: string;
  label: string;
  levelHints: Record<LcjrLevelValue, string>;
};

type DimensionDef = {
  key: string;
  label: string;
  subDimensions: SubDimensionDef[];
};

export const LCJR_RUBRIC: DimensionDef[] = [
  {
    key: "NOTICING",
    label: "Noticing",
    subDimensions: [
      {
        key: "FOCUSED_OBSERVATION",
        label: "Focused Observation",
        levelHints: {
          1: "Misses relevant details even when prompted to look for them.",
          2: "Notices obvious details but needs prompting for subtler ones.",
          3: "Consistently observes relevant details without prompting.",
          4: "Observes efficiently and notices details others might miss.",
        },
      },
      {
        key: "RECOGNIZING_DEVIATIONS",
        label: "Recognizing Deviations from Expected Patterns",
        levelHints: {
          1: "Does not recognize when something is outside the expected pattern.",
          2: "Recognizes obvious deviations but misses subtle ones.",
          3: "Reliably recognizes deviations from what's expected.",
          4: "Quickly recognizes even subtle deviations and their significance.",
        },
      },
      {
        key: "INFORMATION_SEEKING",
        label: "Information Seeking",
        levelHints: {
          1: "Does not seek out additional information when needed.",
          2: "Seeks information only when directed to.",
          3: "Proactively seeks relevant information without being told.",
          4: "Anticipates what information will be needed and seeks it early.",
        },
      },
    ],
  },
  {
    key: "INTERPRETING",
    label: "Interpreting",
    subDimensions: [
      {
        key: "PRIORITIZING_DATA",
        label: "Prioritizing Data",
        levelHints: {
          1: "Treats all data as equally important; cannot identify what matters most.",
          2: "Identifies the most important data with some guidance.",
          3: "Independently prioritizes data by clinical importance.",
          4: "Prioritizes complex or conflicting data quickly and accurately.",
        },
      },
      {
        key: "MAKING_SENSE_OF_DATA",
        label: "Making Sense of Data",
        levelHints: {
          1: "Struggles to connect data into a coherent picture.",
          2: "Makes basic connections between data points with support.",
          3: "Independently synthesizes data into a coherent clinical picture.",
          4: "Synthesizes complex or ambiguous data into clear, well-reasoned conclusions.",
        },
      },
    ],
  },
  {
    key: "RESPONDING",
    label: "Responding",
    subDimensions: [
      {
        key: "CALM_CONFIDENT_MANNER",
        label: "Calm/Confident Manner",
        levelHints: {
          1: "Appears anxious or overwhelmed, which affects performance.",
          2: "Manages to stay composed in routine situations only.",
          3: "Maintains a calm, confident manner in most situations.",
          4: "Remains calm and confident even under pressure, reassuring others.",
        },
      },
      {
        key: "CLEAR_COMMUNICATION",
        label: "Clear Communication",
        levelHints: {
          1: "Communication is unclear or incomplete.",
          2: "Communicates adequately but sometimes lacks clarity or detail.",
          3: "Communicates clearly and appropriately with the team and patient.",
          4: "Communicates with exceptional clarity, adapting to the audience.",
        },
      },
      {
        key: "WELL_PLANNED_INTERVENTION",
        label: "Well-Planned Intervention/Flexibility",
        levelHints: {
          1: "Interventions are poorly planned or rigid when circumstances change.",
          2: "Plans interventions adequately but struggles to adapt.",
          3: "Plans interventions well and adapts when circumstances change.",
          4: "Plans and adapts interventions skillfully, anticipating complications.",
        },
      },
      {
        key: "BEING_SKILLFUL",
        label: "Being Skillful",
        levelHints: {
          1: "Lacks the technical skill to perform the intervention safely.",
          2: "Performs the skill adequately but with noticeable hesitation.",
          3: "Performs the skill competently and safely.",
          4: "Performs the skill fluidly and efficiently, as a proficient practitioner would.",
        },
      },
    ],
  },
  {
    key: "REFLECTING",
    label: "Reflecting",
    subDimensions: [
      {
        key: "EVALUATION_SELF_ANALYSIS",
        label: "Evaluation/Self-Analysis",
        levelHints: {
          1: "Does not evaluate their own performance, even when prompted.",
          2: "Evaluates performance only in general terms when asked.",
          3: "Reflects specifically and honestly on their own performance.",
          4: "Reflects deeply and identifies specific, actionable insights unprompted.",
        },
      },
      {
        key: "COMMITMENT_TO_IMPROVEMENT",
        label: "Commitment to Improvement",
        levelHints: {
          1: "Shows little interest in improving or correcting mistakes.",
          2: "Accepts feedback but doesn't visibly act on it.",
          3: "Actively works to improve based on feedback and self-reflection.",
          4: "Consistently seeks out ways to improve beyond what's asked.",
        },
      },
    ],
  },
];

export const LCJR_SUBDIMENSION_COUNT = LCJR_RUBRIC.reduce(
  (sum, d) => sum + d.subDimensions.length,
  0
);

// Flattened list of every sub-dimension with its parent dimension attached —
// convenient for seed.ts to create all 11 ratings without nested loops.
// Live rendering/scoring code uses discipline-template.ts's flattenRubric
// against the Program's actual stored template instead of this constant.
export const LCJR_FLAT: { dimension: string; subDimension: string; label: string }[] =
  LCJR_RUBRIC.flatMap((d) =>
    d.subDimensions.map((s) => ({ dimension: d.key, subDimension: s.key, label: s.label }))
  );
