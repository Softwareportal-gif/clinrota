import { describe, expect, it } from "vitest";
import { anatomyAccess, canLoadModelKey, nextPaidEnd, PLANS, TRIAL_DAYS, trialEnd } from "@/lib/anatomy/access";

const NOW = new Date("2026-10-18T12:00:00Z");
const days = (n: number) => new Date(NOW.getTime() + n * 86_400_000);

describe("plans", () => {
  it("prices Student and Professional in pesewas, and leaves Institution to sales", () => {
    expect(PLANS.STUDENT.amount).toBe(15000);
    expect(PLANS.PROFESSIONAL.amount).toBe(45000);
    expect(PLANS.INSTITUTION.amount).toBeNull();
  });

  it("gives a 14-day trial", () => {
    expect(TRIAL_DAYS).toBe(14);
    expect(trialEnd(NOW)).toEqual(days(14));
  });
});

describe("anatomyAccess", () => {
  it("gives super admins full access without a plan", () => {
    expect(anatomyAccess({ role: "SUPER_ADMIN", subscription: null, now: NOW, trialLimit: "skeletal" })).toMatchObject({
      level: "full",
    });
  });

  it("limits an active trial to the skeleton when the trial limit is on", () => {
    const access = anatomyAccess({
      role: "LEARNER",
      subscription: { plan: "TRIAL", endsAt: days(10) },
      now: NOW,
      trialLimit: "skeletal",
    });
    expect(access).toEqual({ level: "skeletal", plan: "TRIAL", endsAt: days(10), daysLeft: 10 });
  });

  it("gives an active trial full access while collecting feedback", () => {
    expect(
      anatomyAccess({ role: "LEARNER", subscription: { plan: "TRIAL", endsAt: days(3) }, now: NOW, trialLimit: "none" }).level
    ).toBe("full");
  });

  it("gives a paid plan full access", () => {
    expect(
      anatomyAccess({ role: "STUDENT", subscription: { plan: "STUDENT", endsAt: days(200) }, now: NOW, trialLimit: "skeletal" })
    ).toMatchObject({ level: "full", plan: "STUDENT", daysLeft: 200 });
  });

  it("shuts access once the plan has ended", () => {
    expect(
      anatomyAccess({ role: "LEARNER", subscription: { plan: "TRIAL", endsAt: days(-1) }, now: NOW, trialLimit: "none" })
    ).toEqual({ level: "none", plan: "TRIAL", endsAt: days(-1), daysLeft: 0 });
  });

  it("has no access without a plan", () => {
    expect(anatomyAccess({ role: "STUDENT", subscription: null, now: NOW, trialLimit: "none" })).toEqual({
      level: "none",
      plan: null,
      endsAt: null,
      daysLeft: null,
    });
  });
});

describe("canLoadModelKey", () => {
  const systemOf = (id: string) => (id === "sternum" ? "skeletal" : id === "deltoid" ? "muscular" : undefined);

  it("lets full access load anything", () => {
    expect(canLoadModelKey("full", "v1/overview.glb", systemOf)).toBe(true);
    expect(canLoadModelKey("full", "v1/content/deltoid.json", systemOf)).toBe(true);
  });

  it("limits skeleton-only access to the catalogue and skeletal files", () => {
    expect(canLoadModelKey("skeletal", "v1/catalogue.json", systemOf)).toBe(true);
    expect(canLoadModelKey("skeletal", "v1/chunks/skeletal/thorax/medium.glb", systemOf)).toBe(true);
    expect(canLoadModelKey("skeletal", "v1/chunks/muscular/thorax/medium.glb", systemOf)).toBe(false);
    expect(canLoadModelKey("skeletal", "v1/overview.glb", systemOf)).toBe(false);
    expect(canLoadModelKey("skeletal", "v1/content/sternum.json", systemOf)).toBe(true);
    expect(canLoadModelKey("skeletal", "v1/content/deltoid.json", systemOf)).toBe(false);
    expect(canLoadModelKey("skeletal", "v1/content/unknown.json", systemOf)).toBe(false);
  });

  it("lets no access load nothing", () => {
    expect(canLoadModelKey("none", "v1/catalogue.json", systemOf)).toBe(false);
  });
});

describe("nextPaidEnd", () => {
  it("runs a year from payment, replacing a trial", () => {
    expect(nextPaidEnd({ plan: "TRIAL", endsAt: days(5) }, NOW)).toEqual(new Date("2027-10-18T12:00:00Z"));
    expect(nextPaidEnd(null, NOW)).toEqual(new Date("2027-10-18T12:00:00Z"));
  });

  it("extends an active paid plan from its current end", () => {
    expect(nextPaidEnd({ plan: "STUDENT", endsAt: days(30) }, NOW)).toEqual(new Date("2027-11-17T12:00:00Z"));
  });
});
