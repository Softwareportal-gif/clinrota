-- Discipline Template layer: makes the evaluation rubric and any extra SOAP
-- log fields configurable per Program instead of hardcoded to nursing's
-- LCJR. Written to be safe against a populated database: the new
-- Program.disciplineTemplateId column is added nullable, backfilled to the
-- LCJR template (which every existing Program implicitly already used),
-- and only then made required — no existing Program or evaluation data is
-- lost or altered.

-- 1. DisciplineTemplate table.
CREATE TABLE "DisciplineTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "rubric" JSONB NOT NULL,
    "extraLogFields" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DisciplineTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DisciplineTemplate_name_key" ON "DisciplineTemplate"("name");

-- 2. Seed the two initial templates with fixed, well-known ids so this same
-- migration can backfill existing Programs to reference them, and so
-- prisma/seed.ts can reference them by id without re-inserting duplicates.
-- The LCJR rubric JSON below is machine-generated from src/lib/lcjr.ts's
-- LCJR_RUBRIC/LCJR_LEVELS constants (not hand-typed) to avoid transcription
-- errors against the rubric text already in production use.
INSERT INTO "DisciplineTemplate" ("id", "name", "description", "rubric", "extraLogFields", "updatedAt")
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Lasater (Nursing/Midwifery)',
    'The Lasater Clinical Judgment Rubric — 4 dimensions, 11 sub-dimensions, each scored 1 (Beginning) to 4 (Exemplary).',
    '{"scaleLevels":[{"value":1,"label":"Beginning"},{"value":2,"label":"Developing"},{"value":3,"label":"Accomplished"},{"value":4,"label":"Exemplary"}],"dimensions":[{"key":"NOTICING","label":"Noticing","subDimensions":[{"key":"FOCUSED_OBSERVATION","label":"Focused Observation","levelHints":{"1":"Misses relevant details even when prompted to look for them.","2":"Notices obvious details but needs prompting for subtler ones.","3":"Consistently observes relevant details without prompting.","4":"Observes efficiently and notices details others might miss."}},{"key":"RECOGNIZING_DEVIATIONS","label":"Recognizing Deviations from Expected Patterns","levelHints":{"1":"Does not recognize when something is outside the expected pattern.","2":"Recognizes obvious deviations but misses subtle ones.","3":"Reliably recognizes deviations from what''s expected.","4":"Quickly recognizes even subtle deviations and their significance."}},{"key":"INFORMATION_SEEKING","label":"Information Seeking","levelHints":{"1":"Does not seek out additional information when needed.","2":"Seeks information only when directed to.","3":"Proactively seeks relevant information without being told.","4":"Anticipates what information will be needed and seeks it early."}}]},{"key":"INTERPRETING","label":"Interpreting","subDimensions":[{"key":"PRIORITIZING_DATA","label":"Prioritizing Data","levelHints":{"1":"Treats all data as equally important; cannot identify what matters most.","2":"Identifies the most important data with some guidance.","3":"Independently prioritizes data by clinical importance.","4":"Prioritizes complex or conflicting data quickly and accurately."}},{"key":"MAKING_SENSE_OF_DATA","label":"Making Sense of Data","levelHints":{"1":"Struggles to connect data into a coherent picture.","2":"Makes basic connections between data points with support.","3":"Independently synthesizes data into a coherent clinical picture.","4":"Synthesizes complex or ambiguous data into clear, well-reasoned conclusions."}}]},{"key":"RESPONDING","label":"Responding","subDimensions":[{"key":"CALM_CONFIDENT_MANNER","label":"Calm/Confident Manner","levelHints":{"1":"Appears anxious or overwhelmed, which affects performance.","2":"Manages to stay composed in routine situations only.","3":"Maintains a calm, confident manner in most situations.","4":"Remains calm and confident even under pressure, reassuring others."}},{"key":"CLEAR_COMMUNICATION","label":"Clear Communication","levelHints":{"1":"Communication is unclear or incomplete.","2":"Communicates adequately but sometimes lacks clarity or detail.","3":"Communicates clearly and appropriately with the team and patient.","4":"Communicates with exceptional clarity, adapting to the audience."}},{"key":"WELL_PLANNED_INTERVENTION","label":"Well-Planned Intervention/Flexibility","levelHints":{"1":"Interventions are poorly planned or rigid when circumstances change.","2":"Plans interventions adequately but struggles to adapt.","3":"Plans interventions well and adapts when circumstances change.","4":"Plans and adapts interventions skillfully, anticipating complications."}},{"key":"BEING_SKILLFUL","label":"Being Skillful","levelHints":{"1":"Lacks the technical skill to perform the intervention safely.","2":"Performs the skill adequately but with noticeable hesitation.","3":"Performs the skill competently and safely.","4":"Performs the skill fluidly and efficiently, as a proficient practitioner would."}}]},{"key":"REFLECTING","label":"Reflecting","subDimensions":[{"key":"EVALUATION_SELF_ANALYSIS","label":"Evaluation/Self-Analysis","levelHints":{"1":"Does not evaluate their own performance, even when prompted.","2":"Evaluates performance only in general terms when asked.","3":"Reflects specifically and honestly on their own performance.","4":"Reflects deeply and identifies specific, actionable insights unprompted."}},{"key":"COMMITMENT_TO_IMPROVEMENT","label":"Commitment to Improvement","levelHints":{"1":"Shows little interest in improving or correcting mistakes.","2":"Accepts feedback but doesn''t visibly act on it.","3":"Actively works to improve based on feedback and self-reflection.","4":"Consistently seeks out ways to improve beyond what''s asked."}}]}]}'::jsonb,
    '[]'::jsonb,
    CURRENT_TIMESTAMP
);

INSERT INTO "DisciplineTemplate" ("id", "name", "description", "rubric", "extraLogFields", "updatedAt")
VALUES (
    '00000000-0000-0000-0000-000000000002',
    'Entrustment only (generic fallback)',
    'No discipline-specific rubric built yet — evaluates using only the shared 5-level entrustment scale already used for logbook case ratings.',
    '{"scaleLevels":[{"value":1,"label":"Observation only"},{"value":2,"label":"Direct supervision"},{"value":3,"label":"Indirect supervision"},{"value":4,"label":"Unsupervised"},{"value":5,"label":"Supervising others"}],"dimensions":[{"key":"OVERALL","label":"Overall performance","subDimensions":[{"key":"OVERALL","label":"Overall entrustment level"}]}]}'::jsonb,
    '[]'::jsonb,
    CURRENT_TIMESTAMP
);

-- 3. Program.disciplineTemplateId — nullable first, backfill, then required.
ALTER TABLE "Program" ADD COLUMN "disciplineTemplateId" TEXT;

UPDATE "Program" SET "disciplineTemplateId" = '00000000-0000-0000-0000-000000000001';

ALTER TABLE "Program" ALTER COLUMN "disciplineTemplateId" SET NOT NULL;

ALTER TABLE "Program" ADD CONSTRAINT "Program_disciplineTemplateId_fkey"
    FOREIGN KEY ("disciplineTemplateId") REFERENCES "DisciplineTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "Program_disciplineTemplateId_idx" ON "Program"("disciplineTemplateId");

-- 4. Generalize LcjrRating.dimension/subDimension from the fixed LCJR enums
-- to free-form strings, so a different DisciplineTemplate can define its
-- own dimension/sub-dimension keys. USING ::text preserves every existing
-- row's value exactly (e.g. "NOTICING" stays "NOTICING") — no data lost.
ALTER TABLE "LcjrRating" ALTER COLUMN "dimension" TYPE TEXT USING "dimension"::text;
ALTER TABLE "LcjrRating" ALTER COLUMN "subDimension" TYPE TEXT USING "subDimension"::text;

-- The enums are no longer referenced by any column.
DROP TYPE "LcjrDimension";
DROP TYPE "LcjrSubDimension";

-- 5. LogEntry gets one flexible JSON column for any discipline-specific
-- extra fields (e.g. physiotherapy's ICF fields) — not new columns per
-- discipline. Null for every existing row and for any template (LCJR,
-- generic fallback) that defines no extra fields.
ALTER TABLE "LogEntry" ADD COLUMN "extraFields" JSONB;
