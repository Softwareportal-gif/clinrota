-- Minimum entrustment level required for an approved case to count as
-- "demonstrated" for this competency requirement (competency coverage
-- reporting). Defaults existing rows to DIRECT_SUPERVISION (level 2).
ALTER TABLE "ProgramCompetencyRequirement" ADD COLUMN "minEntrustmentLevel" "EntrustmentLevel" NOT NULL DEFAULT 'DIRECT_SUPERVISION';
