import { describe, expect, it } from "vitest";
import { isPublicAnatomyPage, isSharedPath } from "@/lib/role-routes";

describe("isSharedPath", () => {
  it.each(["/help", "/help/tickets", "/anatomy", "/anatomy/x"])("shares %s across roles", (p) => {
    expect(isSharedPath(p)).toBe(true);
  });

  it.each(["/anatomyx", "/helpdesk", "/student", "/"])("keeps %s to one role", (p) => {
    expect(isSharedPath(p)).toBe(false);
  });
});

describe("isPublicAnatomyPage", () => {
  it.each(["/anatomy/start", "/anatomy/plans", "/anatomy/plans/confirm"])("opens %s to visitors", (p) => {
    expect(isPublicAnatomyPage(p)).toBe(true);
  });

  it.each(["/anatomy", "/anatomy/startx", "/anatomy/x"])("keeps %s behind sign-in", (p) => {
    expect(isPublicAnatomyPage(p)).toBe(false);
  });
});
