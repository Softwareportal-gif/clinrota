-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'SUPERVISOR', 'COORDINATOR', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "RotationStatus" AS ENUM ('SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LogEntryStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'NEEDS_REVISION');

-- CreateEnum
CREATE TYPE "StudentCaseRole" AS ENUM ('OBSERVED', 'ASSISTED', 'PERFORMED_INDEPENDENTLY');

-- CreateEnum
CREATE TYPE "ReviewDecision" AS ENUM ('APPROVED', 'REJECTED', 'NEEDS_REVISION');

-- CreateEnum
CREATE TYPE "TimesheetStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ComplianceDocType" AS ENUM ('IMMUNIZATION_RECORD', 'BLS_CPR_CERTIFICATION', 'BACKGROUND_CHECK', 'INDEMNITY_INSURANCE', 'PROFESSIONAL_BODY_REGISTRATION', 'OTHER');

-- CreateEnum
CREATE TYPE "ComplianceDocStatus" AS ENUM ('PENDING_VERIFICATION', 'VERIFIED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "EvaluationStatus" AS ENUM ('DRAFT', 'SUBMITTED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'BOTH');

-- CreateTable
CREATE TABLE "Institution" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Institution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Program" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "degreeLevel" TEXT,
    "defaultMinCases" INTEGER,
    "defaultMinHours" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Program_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cohort" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cohort_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Competency" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Competency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramCompetencyRequirement" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "competencyId" TEXT NOT NULL,
    "minOccurrences" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ProgramCompetencyRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicalSite" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "mouStartDate" TIMESTAMP(3),
    "mouEndDate" TIMESTAMP(3),
    "mouDocumentUrl" TEXT,
    "maxStudentCapacity" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicalSite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteDepartment" (
    "id" TEXT NOT NULL,
    "clinicalSiteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteDepartment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteCapacityWindow" (
    "id" TEXT NOT NULL,
    "siteDepartmentId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "maxStudents" INTEGER NOT NULL,

    CONSTRAINT "SiteCapacityWindow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "passwordHash" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "studentIdNumber" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "cohortId" TEXT,
    "phone" TEXT,
    "dateOfBirth" TIMESTAMP(3),

    CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupervisorProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "registrationNumber" TEXT,
    "professionalTitle" TEXT,
    "phone" TEXT,

    CONSTRAINT "SupervisorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoordinatorProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,

    CONSTRAINT "CoordinatorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Rotation" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "cohortId" TEXT,
    "clinicalSiteId" TEXT NOT NULL,
    "siteDepartmentId" TEXT,
    "supervisorId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "RotationStatus" NOT NULL DEFAULT 'SCHEDULED',
    "minCasesOverride" INTEGER,
    "minHoursOverride" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogEntry" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "rotationId" TEXT NOT NULL,
    "status" "LogEntryStatus" NOT NULL DEFAULT 'DRAFT',
    "caseTitle" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "studentRole" "StudentCaseRole" NOT NULL,
    "subjective" TEXT NOT NULL,
    "vitalTempC" DOUBLE PRECISION,
    "vitalBpSystolic" INTEGER,
    "vitalBpDiastolic" INTEGER,
    "vitalPulse" INTEGER,
    "vitalRespRate" INTEGER,
    "vitalSpo2" INTEGER,
    "objectiveFindings" TEXT NOT NULL,
    "assessment" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LogEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogEntryCompetency" (
    "id" TEXT NOT NULL,
    "logEntryId" TEXT NOT NULL,
    "competencyId" TEXT NOT NULL,

    CONSTRAINT "LogEntryCompetency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupervisorReview" (
    "id" TEXT NOT NULL,
    "logEntryId" TEXT NOT NULL,
    "supervisorId" TEXT NOT NULL,
    "decision" "ReviewDecision" NOT NULL,
    "comments" TEXT,
    "attested" BOOLEAN NOT NULL DEFAULT false,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupervisorReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetencyEvaluation" (
    "id" TEXT NOT NULL,
    "rotationId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "supervisorId" TEXT NOT NULL,
    "status" "EvaluationStatus" NOT NULL DEFAULT 'DRAFT',
    "evaluationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "overallComments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetencyEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetencyEvaluationItem" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "competencyId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "comments" TEXT,

    CONSTRAINT "CompetencyEvaluationItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimesheetEntry" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "rotationId" TEXT NOT NULL,
    "shiftDate" TIMESTAMP(3) NOT NULL,
    "clockIn" TIMESTAMP(3),
    "clockOut" TIMESTAMP(3),
    "hours" DOUBLE PRECISION NOT NULL,
    "status" "TimesheetStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimesheetEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceDocument" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "documentType" "ComplianceDocType" NOT NULL,
    "customTypeLabel" TEXT,
    "fileUrl" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "verificationStatus" "ComplianceDocStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "rejectionReason" TEXT,
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoringConfig" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "supervisorWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.70,
    "logbookWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.30,
    "logbookCaseCoverageWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.30,
    "logbookApprovalRateWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.30,
    "logbookTimelinessWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.20,
    "logbookCompletenessWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.20,
    "passThreshold" DOUBLE PRECISION NOT NULL DEFAULT 60,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoringConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RotationScore" (
    "id" TEXT NOT NULL,
    "rotationId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "supervisorScore" DOUBLE PRECISION NOT NULL,
    "logbookScore" DOUBLE PRECISION NOT NULL,
    "logbookCaseCoverageScore" DOUBLE PRECISION NOT NULL,
    "logbookApprovalRateScore" DOUBLE PRECISION NOT NULL,
    "logbookTimelinessScore" DOUBLE PRECISION NOT NULL,
    "logbookCompletenessScore" DOUBLE PRECISION NOT NULL,
    "computedFinalScore" DOUBLE PRECISION NOT NULL,
    "finalScore" DOUBLE PRECISION NOT NULL,
    "letterGrade" TEXT,
    "passed" BOOLEAN NOT NULL,
    "isOverridden" BOOLEAN NOT NULL DEFAULT false,
    "overrideReason" TEXT,
    "overriddenById" TEXT,
    "overriddenAt" TIMESTAMP(3),
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RotationScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "emailSentAt" TIMESTAMP(3),
    "relatedEntityType" TEXT,
    "relatedEntityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "beforeData" JSONB,
    "afterData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Program_institutionId_idx" ON "Program"("institutionId");

-- CreateIndex
CREATE INDEX "Cohort_programId_idx" ON "Cohort"("programId");

-- CreateIndex
CREATE INDEX "Competency_programId_idx" ON "Competency"("programId");

-- CreateIndex
CREATE UNIQUE INDEX "ProgramCompetencyRequirement_programId_competencyId_key" ON "ProgramCompetencyRequirement"("programId", "competencyId");

-- CreateIndex
CREATE INDEX "ClinicalSite_institutionId_idx" ON "ClinicalSite"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "SiteDepartment_clinicalSiteId_name_key" ON "SiteDepartment"("clinicalSiteId", "name");

-- CreateIndex
CREATE INDEX "SiteCapacityWindow_siteDepartmentId_startDate_endDate_idx" ON "SiteCapacityWindow"("siteDepartmentId", "startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_institutionId_idx" ON "User"("institutionId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_userId_key" ON "StudentProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_studentIdNumber_key" ON "StudentProfile"("studentIdNumber");

-- CreateIndex
CREATE INDEX "StudentProfile_programId_idx" ON "StudentProfile"("programId");

-- CreateIndex
CREATE INDEX "StudentProfile_cohortId_idx" ON "StudentProfile"("cohortId");

-- CreateIndex
CREATE UNIQUE INDEX "SupervisorProfile_userId_key" ON "SupervisorProfile"("userId");

-- CreateIndex
CREATE INDEX "SupervisorProfile_userId_idx" ON "SupervisorProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CoordinatorProfile_userId_key" ON "CoordinatorProfile"("userId");

-- CreateIndex
CREATE INDEX "CoordinatorProfile_programId_idx" ON "CoordinatorProfile"("programId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "Rotation_studentId_idx" ON "Rotation"("studentId");

-- CreateIndex
CREATE INDEX "Rotation_supervisorId_idx" ON "Rotation"("supervisorId");

-- CreateIndex
CREATE INDEX "Rotation_clinicalSiteId_idx" ON "Rotation"("clinicalSiteId");

-- CreateIndex
CREATE INDEX "Rotation_startDate_endDate_idx" ON "Rotation"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "LogEntry_studentId_idx" ON "LogEntry"("studentId");

-- CreateIndex
CREATE INDEX "LogEntry_rotationId_idx" ON "LogEntry"("rotationId");

-- CreateIndex
CREATE INDEX "LogEntry_status_idx" ON "LogEntry"("status");

-- CreateIndex
CREATE INDEX "LogEntry_occurredAt_idx" ON "LogEntry"("occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "LogEntryCompetency_logEntryId_competencyId_key" ON "LogEntryCompetency"("logEntryId", "competencyId");

-- CreateIndex
CREATE UNIQUE INDEX "SupervisorReview_logEntryId_key" ON "SupervisorReview"("logEntryId");

-- CreateIndex
CREATE INDEX "SupervisorReview_supervisorId_idx" ON "SupervisorReview"("supervisorId");

-- CreateIndex
CREATE INDEX "CompetencyEvaluation_rotationId_idx" ON "CompetencyEvaluation"("rotationId");

-- CreateIndex
CREATE INDEX "CompetencyEvaluation_studentId_idx" ON "CompetencyEvaluation"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "CompetencyEvaluationItem_evaluationId_competencyId_key" ON "CompetencyEvaluationItem"("evaluationId", "competencyId");

-- CreateIndex
CREATE INDEX "TimesheetEntry_studentId_idx" ON "TimesheetEntry"("studentId");

-- CreateIndex
CREATE INDEX "TimesheetEntry_rotationId_idx" ON "TimesheetEntry"("rotationId");

-- CreateIndex
CREATE INDEX "TimesheetEntry_status_idx" ON "TimesheetEntry"("status");

-- CreateIndex
CREATE INDEX "ComplianceDocument_studentId_idx" ON "ComplianceDocument"("studentId");

-- CreateIndex
CREATE INDEX "ComplianceDocument_expiryDate_idx" ON "ComplianceDocument"("expiryDate");

-- CreateIndex
CREATE INDEX "ComplianceDocument_verificationStatus_idx" ON "ComplianceDocument"("verificationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "ScoringConfig_programId_key" ON "ScoringConfig"("programId");

-- CreateIndex
CREATE UNIQUE INDEX "RotationScore_rotationId_key" ON "RotationScore"("rotationId");

-- CreateIndex
CREATE INDEX "RotationScore_studentId_idx" ON "RotationScore"("studentId");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- AddForeignKey
ALTER TABLE "Program" ADD CONSTRAINT "Program_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cohort" ADD CONSTRAINT "Cohort_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Competency" ADD CONSTRAINT "Competency_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramCompetencyRequirement" ADD CONSTRAINT "ProgramCompetencyRequirement_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramCompetencyRequirement" ADD CONSTRAINT "ProgramCompetencyRequirement_competencyId_fkey" FOREIGN KEY ("competencyId") REFERENCES "Competency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalSite" ADD CONSTRAINT "ClinicalSite_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteDepartment" ADD CONSTRAINT "SiteDepartment_clinicalSiteId_fkey" FOREIGN KEY ("clinicalSiteId") REFERENCES "ClinicalSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteCapacityWindow" ADD CONSTRAINT "SiteCapacityWindow_siteDepartmentId_fkey" FOREIGN KEY ("siteDepartmentId") REFERENCES "SiteDepartment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupervisorProfile" ADD CONSTRAINT "SupervisorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoordinatorProfile" ADD CONSTRAINT "CoordinatorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoordinatorProfile" ADD CONSTRAINT "CoordinatorProfile_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rotation" ADD CONSTRAINT "Rotation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rotation" ADD CONSTRAINT "Rotation_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rotation" ADD CONSTRAINT "Rotation_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rotation" ADD CONSTRAINT "Rotation_clinicalSiteId_fkey" FOREIGN KEY ("clinicalSiteId") REFERENCES "ClinicalSite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rotation" ADD CONSTRAINT "Rotation_siteDepartmentId_fkey" FOREIGN KEY ("siteDepartmentId") REFERENCES "SiteDepartment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rotation" ADD CONSTRAINT "Rotation_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "SupervisorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogEntry" ADD CONSTRAINT "LogEntry_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogEntry" ADD CONSTRAINT "LogEntry_rotationId_fkey" FOREIGN KEY ("rotationId") REFERENCES "Rotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogEntryCompetency" ADD CONSTRAINT "LogEntryCompetency_logEntryId_fkey" FOREIGN KEY ("logEntryId") REFERENCES "LogEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogEntryCompetency" ADD CONSTRAINT "LogEntryCompetency_competencyId_fkey" FOREIGN KEY ("competencyId") REFERENCES "Competency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupervisorReview" ADD CONSTRAINT "SupervisorReview_logEntryId_fkey" FOREIGN KEY ("logEntryId") REFERENCES "LogEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupervisorReview" ADD CONSTRAINT "SupervisorReview_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetencyEvaluation" ADD CONSTRAINT "CompetencyEvaluation_rotationId_fkey" FOREIGN KEY ("rotationId") REFERENCES "Rotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetencyEvaluation" ADD CONSTRAINT "CompetencyEvaluation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetencyEvaluation" ADD CONSTRAINT "CompetencyEvaluation_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetencyEvaluationItem" ADD CONSTRAINT "CompetencyEvaluationItem_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "CompetencyEvaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetencyEvaluationItem" ADD CONSTRAINT "CompetencyEvaluationItem_competencyId_fkey" FOREIGN KEY ("competencyId") REFERENCES "Competency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimesheetEntry" ADD CONSTRAINT "TimesheetEntry_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimesheetEntry" ADD CONSTRAINT "TimesheetEntry_rotationId_fkey" FOREIGN KEY ("rotationId") REFERENCES "Rotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimesheetEntry" ADD CONSTRAINT "TimesheetEntry_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceDocument" ADD CONSTRAINT "ComplianceDocument_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceDocument" ADD CONSTRAINT "ComplianceDocument_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoringConfig" ADD CONSTRAINT "ScoringConfig_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoringConfig" ADD CONSTRAINT "ScoringConfig_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RotationScore" ADD CONSTRAINT "RotationScore_rotationId_fkey" FOREIGN KEY ("rotationId") REFERENCES "Rotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RotationScore" ADD CONSTRAINT "RotationScore_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RotationScore" ADD CONSTRAINT "RotationScore_overriddenById_fkey" FOREIGN KEY ("overriddenById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
