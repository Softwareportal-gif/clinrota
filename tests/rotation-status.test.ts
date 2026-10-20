import { describe, expect, it } from "vitest";
import { canLogAgainst, LOGGING_GRACE_DAYS, rotationPhase, rotationPhaseLabel, statusForNewRotation } from "@/lib/rotation-status";

const d = (s: string) => new Date(`${s}T12:00:00Z`);
const rot = (startDate: string, endDate: string, status: "SCHEDULED" | "ACTIVE" | "COMPLETED" | "CANCELLED" = "ACTIVE") => ({
  status,
  startDate: new Date(`${startDate}T00:00:00Z`),
  endDate: new Date(`${endDate}T00:00:00Z`),
});

describe("rotationPhase", () => {
  it("is upcoming before the start date", () => {
    expect(rotationPhase(rot("2026-11-01", "2026-12-01"), d("2026-10-20"))).toBe("SCHEDULED");
  });

  it("is active from the start date through the whole end date", () => {
    expect(rotationPhase(rot("2026-09-01", "2026-11-01"), d("2026-09-01"))).toBe("ACTIVE");
    expect(rotationPhase(rot("2026-09-01", "2026-11-01"), new Date("2026-11-01T23:30:00Z"))).toBe("ACTIVE");
  });

  it("is completed after the end date", () => {
    expect(rotationPhase(rot("2026-09-01", "2026-11-01"), d("2026-11-02"))).toBe("COMPLETED");
  });

  it("keeps a coordinator's cancel or early end", () => {
    expect(rotationPhase(rot("2026-09-01", "2026-11-01", "CANCELLED"), d("2026-10-01"))).toBe("CANCELLED");
    expect(rotationPhase(rot("2026-09-01", "2026-11-01", "COMPLETED"), d("2026-10-01"))).toBe("COMPLETED");
  });

  it("has a plain label for each phase", () => {
    expect(rotationPhaseLabel("SCHEDULED")).toBe("Upcoming");
    expect(rotationPhaseLabel("ACTIVE")).toBe("Active");
    expect(rotationPhaseLabel("COMPLETED")).toBe("Completed");
    expect(rotationPhaseLabel("CANCELLED")).toBe("Cancelled");
  });
});

describe("canLogAgainst", () => {
  it("allows logging while active and for a short catch-up after it ends", () => {
    const r = rot("2026-09-01", "2026-11-01");
    expect(canLogAgainst(r, d("2026-10-01"))).toBe(true);
    expect(canLogAgainst(r, d(`2026-11-0${1 + LOGGING_GRACE_DAYS}`))).toBe(true);
    expect(canLogAgainst(r, d(`2026-11-${String(2 + LOGGING_GRACE_DAYS).padStart(2, "0")}`))).toBe(false);
  });

  it("refuses before the start, and when cancelled", () => {
    expect(canLogAgainst(rot("2026-11-01", "2026-12-01"), d("2026-10-20"))).toBe(false);
    expect(canLogAgainst(rot("2026-09-01", "2026-11-01", "CANCELLED"), d("2026-10-01"))).toBe(false);
  });
});

describe("statusForNewRotation", () => {
  it("is scheduled when it starts later, active when it has started", () => {
    expect(statusForNewRotation(new Date("2026-11-01T00:00:00Z"), d("2026-10-20"))).toBe("SCHEDULED");
    expect(statusForNewRotation(new Date("2026-10-20T00:00:00Z"), d("2026-10-20"))).toBe("ACTIVE");
  });
});
