-- New enums for the entrustment scale and the LCJR rubric structure
CREATE TYPE "EntrustmentLevel" AS ENUM ('OBSERVATION_ONLY', 'DIRECT_SUPERVISION', 'INDIRECT_SUPERVISION', 'UNSUPERVISED', 'SUPERVISING_OTHERS');

CREATE TYPE "LcjrDimension" AS ENUM ('NOTICING', 'INTERPRETING', 'RESPONDING', 'REFLECTING');

CREATE TYPE "LcjrSubDimension" AS ENUM ('FOCUSED_OBSERVATION', 'RECOGNIZING_DEVIATIONS', 'INFORMATION_SEEKING', 'PRIORITIZING_DATA', 'MAKING_SENSE_OF_DATA', 'CALM_CONFIDENT_MANNER', 'CLEAR_COMMUNICATION', 'WELL_PLANNED_INTERVENTION', 'BEING_SKILLFUL', 'EVALUATION_SELF_ANALYSIS', 'COMMITMENT_TO_IMPROVEMENT');

-- Migrate LogEntry.studentRole from StudentCaseRole to EntrustmentLevel,
-- mapping old values onto the new 5-level scale:
--   OBSERVED -> OBSERVATION_ONLY, ASSISTED -> DIRECT_SUPERVISION,
--   PERFORMED_INDEPENDENTLY -> UNSUPERVISED
ALTER TABLE "LogEntry" ADD COLUMN "studentRole_new" "EntrustmentLevel";

UPDATE "LogEntry" SET "studentRole_new" = CASE "studentRole"::text
    WHEN 'OBSERVED' THEN 'OBSERVATION_ONLY'
    WHEN 'ASSISTED' THEN 'DIRECT_SUPERVISION'
    WHEN 'PERFORMED_INDEPENDENTLY' THEN 'UNSUPERVISED'
END::"EntrustmentLevel";

ALTER TABLE "LogEntry" DROP COLUMN "studentRole";
ALTER TABLE "LogEntry" RENAME COLUMN "studentRole_new" TO "studentRole";
ALTER TABLE "LogEntry" ALTER COLUMN "studentRole" SET NOT NULL;

-- New: supervisor's own assessed entrustment level, set during review
ALTER TABLE "LogEntry" ADD COLUMN "supervisorAssessedRole" "EntrustmentLevel";

-- The old enum is no longer referenced anywhere
DROP TYPE "StudentCaseRole";

-- Replace the generic per-Competency evaluation rubric with LCJR ratings
DROP TABLE "CompetencyEvaluationItem";

CREATE TABLE "LcjrRating" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "dimension" "LcjrDimension" NOT NULL,
    "subDimension" "LcjrSubDimension" NOT NULL,
    "level" INTEGER NOT NULL,

    CONSTRAINT "LcjrRating_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LcjrRating_evaluationId_subDimension_key" ON "LcjrRating"("evaluationId", "subDimension");

ALTER TABLE "LcjrRating" ADD CONSTRAINT "LcjrRating_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "CompetencyEvaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
