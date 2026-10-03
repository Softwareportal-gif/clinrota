-- Bulk student onboarding: a UserStatus lifecycle field on User, and a
-- StudentImportBatch audit-trail table for each CSV upload.

-- 1. UserStatus enum + User.status, defaulting every existing row (of any
-- role) to ACTIVE so nothing already working is affected retroactively.
CREATE TYPE "UserStatus" AS ENUM ('IMPORTED', 'INVITED', 'ACTIVE');

ALTER TABLE "User" ADD COLUMN "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE';

-- 2. StudentImportBatch.
CREATE TABLE "StudentImportBatch" (
    "id" TEXT NOT NULL,
    "coordinatorId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "cohortId" TEXT,
    "fileName" TEXT NOT NULL,
    "totalRows" INTEGER NOT NULL,
    "successCount" INTEGER NOT NULL,
    "errorCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentImportBatch_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StudentImportBatch_programId_idx" ON "StudentImportBatch"("programId");
CREATE INDEX "StudentImportBatch_coordinatorId_idx" ON "StudentImportBatch"("coordinatorId");

ALTER TABLE "StudentImportBatch" ADD CONSTRAINT "StudentImportBatch_coordinatorId_fkey"
    FOREIGN KEY ("coordinatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentImportBatch" ADD CONSTRAINT "StudentImportBatch_programId_fkey"
    FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentImportBatch" ADD CONSTRAINT "StudentImportBatch_cohortId_fkey"
    FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE SET NULL ON UPDATE CASCADE;
