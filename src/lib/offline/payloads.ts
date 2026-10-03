import type { EntrustmentLevel } from "@/generated/prisma/client";

// Payload shapes for each queueable operation. Kept as plain
// JSON-serializable objects (dates as ISO strings) so they survive
// IndexedDB storage and can be replayed as plain server action arguments.

export type CreateLogEntryPayload = {
  id: string;
  rotationId: string;
  competencyId: string;
  caseTitle: string;
  studentRole: EntrustmentLevel;
  occurredAt: string;
  // Set from the rotation's currently-active WardAssignment when the site
  // has ward supervision on — the client never lets a student pick this
  // per entry, and the server re-validates it regardless. Omitted/undefined
  // when the site doesn't use ward supervision.
  wardAssignmentId?: string;
};

export type CreateWardAssignmentPayload = {
  id: string;
  rotationId: string;
  wardName: string;
  wardSupervisorId: string; // SupervisorProfile.id
};

export type EndWardAssignmentPayload = {
  wardAssignmentId: string;
};

export type SaveLogStepPayload =
  | { step: "subjective"; logEntryId: string; subjective: string }
  | {
      step: "objective";
      logEntryId: string;
      vitalTempC: number | null;
      vitalBpSystolic: number | null;
      vitalBpDiastolic: number | null;
      vitalPulse: number | null;
      vitalRespRate: number | null;
      vitalSpo2: number | null;
      objectiveFindings: string;
    }
  | { step: "assessment"; logEntryId: string; assessment: string }
  | {
      step: "plan";
      logEntryId: string;
      plan: string;
      intent: "draft" | "submit";
      // Values for the Program's DisciplineTemplate.extraLogFields, keyed
      // by field key — omitted/empty for any template (LCJR, generic
      // fallback) that defines none.
      extraFields?: Record<string, string>;
    };

export type SubmitTimesheetPayload = {
  id: string;
  rotationId: string;
  shiftDate: string;
  clockIn: string | null;
  clockOut: string | null;
  hours: number;
  notes: string | null;
};

export type SubmitReviewPayload = {
  id: string;
  logEntryId: string;
  intent: "approve" | "reject" | "revise";
  comments: string;
  attested: boolean;
  supervisorAssessedRole: EntrustmentLevel;
};
