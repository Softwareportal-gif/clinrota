-- Rotation preferences ("wishlist") for the student dashboard, plus two
-- new free-text profile fields.

ALTER TABLE "StudentProfile" ADD COLUMN "areasOfInterest" TEXT;
ALTER TABLE "StudentProfile" ADD COLUMN "personalStatement" TEXT;

CREATE TABLE "PreferenceCycle" (
    "id" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "minSelections" INTEGER NOT NULL,
    "maxSelections" INTEGER NOT NULL,
    "submissionDeadline" TIMESTAMP(3) NOT NULL,
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreferenceCycle_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PreferenceCycle_cohortId_idx" ON "PreferenceCycle"("cohortId");

ALTER TABLE "PreferenceCycle" ADD CONSTRAINT "PreferenceCycle_cohortId_fkey"
    FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "RotationPreference" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "clinicalSiteId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RotationPreference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RotationPreference_cycleId_studentId_clinicalSiteId_key"
    ON "RotationPreference"("cycleId", "studentId", "clinicalSiteId");
CREATE UNIQUE INDEX "RotationPreference_cycleId_studentId_rank_key"
    ON "RotationPreference"("cycleId", "studentId", "rank");
CREATE INDEX "RotationPreference_studentId_idx" ON "RotationPreference"("studentId");
CREATE INDEX "RotationPreference_clinicalSiteId_idx" ON "RotationPreference"("clinicalSiteId");

ALTER TABLE "RotationPreference" ADD CONSTRAINT "RotationPreference_cycleId_fkey"
    FOREIGN KEY ("cycleId") REFERENCES "PreferenceCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RotationPreference" ADD CONSTRAINT "RotationPreference_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RotationPreference" ADD CONSTRAINT "RotationPreference_clinicalSiteId_fkey"
    FOREIGN KEY ("clinicalSiteId") REFERENCES "ClinicalSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PreferenceSubmission" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PreferenceSubmission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PreferenceSubmission_cycleId_studentId_key"
    ON "PreferenceSubmission"("cycleId", "studentId");

ALTER TABLE "PreferenceSubmission" ADD CONSTRAINT "PreferenceSubmission_cycleId_fkey"
    FOREIGN KEY ("cycleId") REFERENCES "PreferenceCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PreferenceSubmission" ADD CONSTRAINT "PreferenceSubmission_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
