-- Per-program compliance document type list (replaces the fixed
-- ComplianceDocType enum, mirroring how Competency requirements work)
CREATE TABLE "RequiredDocumentType" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "RequiredDocumentType_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RequiredDocumentType_programId_name_key" ON "RequiredDocumentType"("programId", "name");
CREATE INDEX "RequiredDocumentType_programId_idx" ON "RequiredDocumentType"("programId");

ALTER TABLE "RequiredDocumentType" ADD CONSTRAINT "RequiredDocumentType_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed the previous five fixed types onto every existing program, so
-- existing ComplianceDocument rows have somewhere to point.
INSERT INTO "RequiredDocumentType" ("id", "programId", "name")
SELECT gen_random_uuid(), "Program"."id", "defaults"."name"
FROM "Program", (VALUES
    ('Immunization Record'),
    ('BLS/CPR Certification'),
    ('Background Check'),
    ('Indemnity Insurance'),
    ('Professional Body Registration')
) AS "defaults"("name");

-- Point existing ComplianceDocument rows at the matching new type, via the
-- student's program, before the old enum column is dropped.
ALTER TABLE "ComplianceDocument" ADD COLUMN "requiredDocumentTypeId" TEXT;

UPDATE "ComplianceDocument" cd
SET "requiredDocumentTypeId" = rdt."id"
FROM "StudentProfile" sp, "RequiredDocumentType" rdt
WHERE cd."studentId" = sp."id"
  AND rdt."programId" = sp."programId"
  AND rdt."name" = CASE cd."documentType"::text
        WHEN 'IMMUNIZATION_RECORD' THEN 'Immunization Record'
        WHEN 'BLS_CPR_CERTIFICATION' THEN 'BLS/CPR Certification'
        WHEN 'BACKGROUND_CHECK' THEN 'Background Check'
        WHEN 'INDEMNITY_INSURANCE' THEN 'Indemnity Insurance'
        WHEN 'PROFESSIONAL_BODY_REGISTRATION' THEN 'Professional Body Registration'
    END;

ALTER TABLE "ComplianceDocument" DROP COLUMN "documentType";
ALTER TABLE "ComplianceDocument" DROP COLUMN "customTypeLabel";
ALTER TABLE "ComplianceDocument" ALTER COLUMN "requiredDocumentTypeId" SET NOT NULL;

CREATE UNIQUE INDEX "ComplianceDocument_studentId_requiredDocumentTypeId_key" ON "ComplianceDocument"("studentId", "requiredDocumentTypeId");

ALTER TABLE "ComplianceDocument" ADD CONSTRAINT "ComplianceDocument_requiredDocumentTypeId_fkey" FOREIGN KEY ("requiredDocumentTypeId") REFERENCES "RequiredDocumentType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

DROP TYPE "ComplianceDocType";

-- "Expired" is now a computed, read-time overlay (see
-- src/lib/compliance-status.ts) rather than a storable review outcome, so
-- drop it from the enum. No existing row uses it.
CREATE TYPE "ComplianceDocStatus_new" AS ENUM ('PENDING_VERIFICATION', 'VERIFIED', 'REJECTED');
ALTER TABLE "ComplianceDocument" ALTER COLUMN "verificationStatus" DROP DEFAULT;
ALTER TABLE "ComplianceDocument" ALTER COLUMN "verificationStatus" TYPE "ComplianceDocStatus_new" USING ("verificationStatus"::text::"ComplianceDocStatus_new");
ALTER TABLE "ComplianceDocument" ALTER COLUMN "verificationStatus" SET DEFAULT 'PENDING_VERIFICATION';
DROP TYPE "ComplianceDocStatus";
ALTER TYPE "ComplianceDocStatus_new" RENAME TO "ComplianceDocStatus";
