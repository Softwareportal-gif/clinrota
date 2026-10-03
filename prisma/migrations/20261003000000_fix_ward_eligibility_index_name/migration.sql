-- Postgres truncated this 64+ char index name differently from Prisma's own
-- truncation scheme; align it so `migrate diff` reports no drift.
ALTER INDEX "WardSupervisorEligibility_clinicalSiteId_supervisorProfileId_ke" RENAME TO "WardSupervisorEligibility_clinicalSiteId_supervisorProfileI_key";
