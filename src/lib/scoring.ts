import { prisma } from "@/lib/prisma";
import { parseRubric, rubricPercent } from "@/lib/discipline-template";
import { checkRequirements, isSoapComplete } from "@/lib/rotation-requirements";

// ── Tunable constants ───────────────────────────────────────────────────
// Logbook sub-component weights (must sum to 1.0). Only the top-level
// supervisor/logbook split is coordinator-configurable via ScoringConfig
// for now — these sub-weights are a fixed formula until real usage data
// suggests better ones. Change them here if that happens.
export const LOGBOOK_SUBWEIGHTS = {
  competencyCoverage: 0.4,
  approvalRate: 0.3,
  timeliness: 0.15,
  soapCompleteness: 0.15,
} as const;

export const DEFAULT_SUPERVISOR_WEIGHT = 0.7;
export const DEFAULT_LOGBOOK_WEIGHT = 0.3;
export const DEFAULT_PASS_THRESHOLD = 60;

// An entry is "on time" if submitted within this many hours of the case date.
const TIMELINESS_WINDOW_MS = 48 * 60 * 60 * 1000;

// SOAP completeness: see isSoapComplete in src/lib/rotation-requirements.ts.

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export type ScoreBreakdown = {
  competencyCoverageScore: number;
  approvalRateScore: number;
  timelinessScore: number;
  completenessScore: number;
};

export type ScoreResult =
  | { scoreable: false; reason: string }
  | {
      scoreable: true;
      supervisorScore: number;
      logbookScore: number;
      breakdown: ScoreBreakdown;
      computedFinalScore: number;
      passed: boolean;
      passThreshold: number;
      // Approved hours and cases still short of the rotation's requirement;
      // a rotation can't pass until this is empty.
      requirementsMissing: string[];
      supervisorWeight: number;
      logbookWeight: number;
    };

export async function computeRotationScore(rotationId: string): Promise<ScoreResult> {
  const rotation = await prisma.rotation.findUnique({
    where: { id: rotationId },
    include: {
      program: {
        include: { scoringConfig: true, requiredCompetencies: true, disciplineTemplate: true },
      },
    },
  });
  if (!rotation) return { scoreable: false, reason: "Rotation not found." };

  // ── Supervisor score: average of the rotation's finalized evaluation
  // ratings, each converted from the Program's DisciplineTemplate scale
  // (4-level LCJR, 5-level entrustment-only fallback, etc.) to a
  // percentage, then averaged. ──
  const evaluation = await prisma.competencyEvaluation.findFirst({
    where: { rotationId, studentId: rotation.studentId, status: "SUBMITTED" },
    include: { ratings: true },
  });
  if (!evaluation || evaluation.ratings.length === 0) {
    return { scoreable: false, reason: "No finalized supervisor evaluation yet." };
  }
  const rubric = parseRubric(rotation.program.disciplineTemplate.rubric);
  const supervisorPercent = rubricPercent(evaluation.ratings, rubric);
  if (supervisorPercent === null) {
    return { scoreable: false, reason: "The supervisor evaluation has no scored items rated." };
  }
  const supervisorScore = clamp(supervisorPercent, 0, 100);

  // ── Logbook: competency coverage ──────────────────────────────────
  const requiredCompetencyIds = rotation.program.requiredCompetencies.map((r) => r.competencyId);
  let competencyCoverageScore = 100; // nothing required = vacuously covered
  if (requiredCompetencyIds.length > 0) {
    const coveredLinks = await prisma.logEntryCompetency.findMany({
      where: {
        competencyId: { in: requiredCompetencyIds },
        logEntry: { rotationId, status: "APPROVED" },
      },
      select: { competencyId: true },
      distinct: ["competencyId"],
    });
    competencyCoverageScore = (coveredLinks.length / requiredCompetencyIds.length) * 100;
  }

  // ── Logbook: approval rate (excludes drafts and entries still pending) ──
  const [approvedCount, rejectedCount] = await Promise.all([
    prisma.logEntry.count({ where: { rotationId, status: "APPROVED" } }),
    prisma.logEntry.count({ where: { rotationId, status: "REJECTED" } }),
  ]);
  const decidedCount = approvedCount + rejectedCount;
  const approvalRateScore = decidedCount > 0 ? (approvedCount / decidedCount) * 100 : 0;

  // ── Logbook: timeliness of submission ──────────────────────────────
  const submittedEntries = await prisma.logEntry.findMany({
    where: { rotationId, submittedAt: { not: null } },
    select: { occurredAt: true, submittedAt: true },
  });
  let timelinessScore = 0;
  if (submittedEntries.length > 0) {
    const onTimeCount = submittedEntries.filter(
      (e) => e.submittedAt!.getTime() - e.occurredAt.getTime() <= TIMELINESS_WINDOW_MS
    ).length;
    timelinessScore = (onTimeCount / submittedEntries.length) * 100;
  }

  // ── Logbook: SOAP documentation completeness (approved entries only) ──
  const approvedEntries = await prisma.logEntry.findMany({
    where: { rotationId, status: "APPROVED" },
    select: { subjective: true, objectiveFindings: true, assessment: true, plan: true },
  });
  let completenessScore = 0;
  if (approvedEntries.length > 0) {
    const completeCount = approvedEntries.filter(isSoapComplete).length;
    completenessScore = (completeCount / approvedEntries.length) * 100;
  }

  const logbookScore = clamp(
    competencyCoverageScore * LOGBOOK_SUBWEIGHTS.competencyCoverage +
      approvalRateScore * LOGBOOK_SUBWEIGHTS.approvalRate +
      timelinessScore * LOGBOOK_SUBWEIGHTS.timeliness +
      completenessScore * LOGBOOK_SUBWEIGHTS.soapCompleteness,
    0,
    100
  );

  const config = rotation.program.scoringConfig;
  const supervisorWeight = config?.supervisorWeight ?? DEFAULT_SUPERVISOR_WEIGHT;
  const logbookWeight = config?.logbookWeight ?? DEFAULT_LOGBOOK_WEIGHT;
  const passThreshold = config?.passThreshold ?? DEFAULT_PASS_THRESHOLD;

  const computedFinalScore = clamp(
    supervisorScore * supervisorWeight + logbookScore * logbookWeight,
    0,
    100
  );

  // ── Requirements: approved hours and cases, whatever the score ──
  const approvedHours = await prisma.timesheetEntry.aggregate({
    where: { rotationId, status: "APPROVED" },
    _sum: { hours: true },
  });
  const requirements = checkRequirements({
    approvedHours: approvedHours._sum.hours ?? 0,
    requiredHours: rotation.minHoursOverride ?? rotation.program.defaultMinHours,
    approvedCases: approvedCount,
    requiredCases: rotation.minCasesOverride ?? rotation.program.defaultMinCases,
  });

  return {
    scoreable: true,
    supervisorScore,
    logbookScore,
    breakdown: {
      competencyCoverageScore,
      approvalRateScore,
      timelinessScore,
      completenessScore,
    },
    computedFinalScore,
    passed: computedFinalScore >= passThreshold && requirements.met,
    passThreshold,
    requirementsMissing: requirements.missing,
    supervisorWeight,
    logbookWeight,
  };
}
