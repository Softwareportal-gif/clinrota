import type { EntrustmentLevel } from "@/generated/prisma/client";

// Ordered 1 (least autonomy) to 5 (most) — the numeric order isn't encoded
// by the Postgres/Prisma enum itself, so it lives here for calculations.
export const ENTRUSTMENT_LEVEL_ORDER: EntrustmentLevel[] = [
  "OBSERVATION_ONLY",
  "DIRECT_SUPERVISION",
  "INDIRECT_SUPERVISION",
  "UNSUPERVISED",
  "SUPERVISING_OTHERS",
];

export const ENTRUSTMENT_LEVEL_VALUE: Record<EntrustmentLevel, number> = {
  OBSERVATION_ONLY: 1,
  DIRECT_SUPERVISION: 2,
  INDIRECT_SUPERVISION: 3,
  UNSUPERVISED: 4,
  SUPERVISING_OTHERS: 5,
};

export const ENTRUSTMENT_LEVEL_LABELS: Record<EntrustmentLevel, string> = {
  OBSERVATION_ONLY: "1 — Observation only",
  DIRECT_SUPERVISION: "2 — Performed under direct supervision",
  INDIRECT_SUPERVISION: "3 — Performed under indirect supervision",
  UNSUPERVISED: "4 — Performed unsupervised",
  SUPERVISING_OTHERS: "5 — Performed while supervising/teaching another learner",
};

export const ENTRUSTMENT_LEVEL_SHORT_LABELS: Record<EntrustmentLevel, string> = {
  OBSERVATION_ONLY: "Observation only",
  DIRECT_SUPERVISION: "Direct supervision",
  INDIRECT_SUPERVISION: "Indirect supervision",
  UNSUPERVISED: "Unsupervised",
  SUPERVISING_OTHERS: "Supervising others",
};
