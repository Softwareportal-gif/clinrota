-- Ward-level sub-supervisor logbook review: optional per clinical site, does
-- not touch CompetencyEvaluation/RotationScore/ScoringConfig at all.

-- 1. Opt-in flag on ClinicalSite, defaulting existing sites (and every site
-- created before this feature) to off — zero behavior change unless a
-- coordinator explicitly turns it on.
ALTER TABLE "ClinicalSite" ADD COLUMN "wardSupervisionEnabled" BOOLEAN NOT NULL DEFAULT false;

-- 2. Coordinator-managed roster of who's eligible to be picked as a ward
-- supervisor at a given site.
CREATE TABLE "WardSupervisorEligibility" (
    "id" TEXT NOT NULL,
    "clinicalSiteId" TEXT NOT NULL,
    "supervisorProfileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WardSupervisorEligibility_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WardSupervisorEligibility_clinicalSiteId_supervisorProfileId_key"
    ON "WardSupervisorEligibility"("clinicalSiteId", "supervisorProfileId");

ALTER TABLE "WardSupervisorEligibility" ADD CONSTRAINT "WardSupervisorEligibility_clinicalSiteId_fkey"
    FOREIGN KEY ("clinicalSiteId") REFERENCES "ClinicalSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WardSupervisorEligibility" ADD CONSTRAINT "WardSupervisorEligibility_supervisorProfileId_fkey"
    FOREIGN KEY ("supervisorProfileId") REFERENCES "SupervisorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 3. A student's assignment to one ward + ward supervisor within a rotation.
-- id is client-generated (not gen_random_uuid()) so it can be created
-- offline, same reasoning as LogEntry.id.
CREATE TABLE "WardAssignment" (
    "id" TEXT NOT NULL,
    "rotationId" TEXT NOT NULL,
    "wardName" TEXT NOT NULL,
    "wardSupervisorId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WardAssignment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WardAssignment_rotationId_idx" ON "WardAssignment"("rotationId");
CREATE INDEX "WardAssignment_wardSupervisorId_idx" ON "WardAssignment"("wardSupervisorId");

-- Only one active (endedAt IS NULL) assignment per rotation at a time —
-- a partial unique index, not @@unique (Prisma's schema DSL can't express
-- a WHERE clause), enforced at the DB level in addition to the application
-- check in createWardAssignmentCore.
CREATE UNIQUE INDEX "WardAssignment_one_active_per_rotation"
    ON "WardAssignment"("rotationId") WHERE "endedAt" IS NULL;

ALTER TABLE "WardAssignment" ADD CONSTRAINT "WardAssignment_rotationId_fkey"
    FOREIGN KEY ("rotationId") REFERENCES "Rotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WardAssignment" ADD CONSTRAINT "WardAssignment_wardSupervisorId_fkey"
    FOREIGN KEY ("wardSupervisorId") REFERENCES "SupervisorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 4. LogEntry gets an optional pointer to the WardAssignment active when it
-- was created. Null for every existing row and for any site that never
-- turns ward supervision on — SupervisorReview routing treats null exactly
-- as it does today (see src/lib/log-entry-review.ts).
ALTER TABLE "LogEntry" ADD COLUMN "wardAssignmentId" TEXT;

CREATE INDEX "LogEntry_wardAssignmentId_idx" ON "LogEntry"("wardAssignmentId");

ALTER TABLE "LogEntry" ADD CONSTRAINT "LogEntry_wardAssignmentId_fkey"
    FOREIGN KEY ("wardAssignmentId") REFERENCES "WardAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
