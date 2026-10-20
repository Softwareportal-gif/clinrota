import { describe, expect, it } from "vitest";
import { checkRequirements, isSoapComplete, SOAP_MIN_WORDS } from "@/lib/rotation-requirements";

describe("checkRequirements", () => {
  it("is met when approved hours and cases reach what's required", () => {
    const r = checkRequirements({ approvedHours: 160, requiredHours: 160, approvedCases: 10, requiredCases: 10 });
    expect(r.met).toBe(true);
    expect(r.missing).toEqual([]);
  });

  it("lists what is still missing, in plain words", () => {
    const r = checkRequirements({ approvedHours: 8, requiredHours: 160, approvedCases: 1, requiredCases: 5 });
    expect(r.met).toBe(false);
    expect(r.missing).toEqual(["152 more approved hours", "4 more approved cases"]);
  });

  it("uses singular words for one", () => {
    expect(checkRequirements({ approvedHours: 159, requiredHours: 160, approvedCases: 4, requiredCases: 5 }).missing).toEqual([
      "1 more approved hour",
      "1 more approved case",
    ]);
  });

  it("treats a requirement nobody set as met", () => {
    expect(checkRequirements({ approvedHours: 0, requiredHours: null, approvedCases: 0, requiredCases: null }).met).toBe(true);
  });

  it("shows hours with at most one decimal", () => {
    expect(checkRequirements({ approvedHours: 7.25, requiredHours: 8, approvedCases: 0, requiredCases: null }).missing).toEqual([
      "0.8 more approved hours",
    ]);
  });
});

describe("isSoapComplete", () => {
  it("accepts short but real clinical notes in every section", () => {
    expect(
      isSoapComplete({
        subjective: "Mild pain, no fever.",
        objectiveFindings: "Wound clean and dry.",
        assessment: "Healing well, no infection.",
        plan: "Daily dressing, review 48 hours.",
      })
    ).toBe(true);
  });

  it("rejects an empty or one-word section", () => {
    expect(isSoapComplete({ subjective: "Pain", objectiveFindings: "Wound clean and dry.", assessment: "Healing well.", plan: "Dressing daily." })).toBe(false);
    expect(isSoapComplete({ subjective: "", objectiveFindings: "a b c", assessment: "a b c", plan: "a b c" })).toBe(false);
  });

  it("needs at least the minimum words", () => {
    expect(SOAP_MIN_WORDS).toBe(3);
  });
});
