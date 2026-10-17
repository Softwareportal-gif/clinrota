import { describe, expect, it } from "vitest";
import { isSharedPath } from "@/lib/role-routes";

describe("isSharedPath", () => {
  it.each(["/help", "/help/tickets", "/anatomy", "/anatomy/x"])("shares %s across roles", (p) => {
    expect(isSharedPath(p)).toBe(true);
  });

  it.each(["/anatomyx", "/helpdesk", "/student", "/"])("keeps %s to one role", (p) => {
    expect(isSharedPath(p)).toBe(false);
  });
});
