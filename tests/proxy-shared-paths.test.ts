import { describe, expect, it } from "vitest";
import { isPublicAnatomyPage, isPublicAuthPage, isSharedPath, loginPageForRole, loginPathFor } from "@/lib/role-routes";

describe("isSharedPath", () => {
  it.each(["/help", "/help/tickets", "/anatomy", "/anatomy/x"])("shares %s across roles", (p) => {
    expect(isSharedPath(p)).toBe(true);
  });

  it.each(["/anatomyx", "/helpdesk", "/student", "/"])("keeps %s to one role", (p) => {
    expect(isSharedPath(p)).toBe(false);
  });
});

describe("isPublicAnatomyPage", () => {
  it.each(["/anatomy/start", "/anatomy/plans", "/anatomy/plans/confirm", "/anatomy/login"])("opens %s to visitors", (p) => {
    expect(isPublicAnatomyPage(p)).toBe(true);
  });

  it.each(["/anatomy", "/anatomy/startx", "/anatomy/x"])("keeps %s behind sign-in", (p) => {
    expect(isPublicAnatomyPage(p)).toBe(false);
  });
});

describe("loginPathFor", () => {
  it.each(["/anatomy", "/anatomy/x"])("sends %s to the Praxxt Anatomy login", (p) => {
    expect(loginPathFor(p)).toBe("/anatomy/login");
  });

  it.each(["/student", "/coordinator/sites", "/anatomyx", "/help/tickets"])("sends %s to the main login", (p) => {
    expect(loginPathFor(p)).toBe("/login");
  });
});

describe("admin login", () => {
  it.each(["/admin", "/admin/anatomy", "/admin/tickets"])("sends %s to the admin login", (p) => {
    expect(loginPathFor(p)).toBe("/admin/login");
  });

  it("opens the admin login to visitors", () => {
    expect(isPublicAuthPage("/admin/login")).toBe(true);
    expect(isPublicAuthPage("/admin")).toBe(false);
  });
});

describe("loginPageForRole", () => {
  it("returns each product's own login", () => {
    expect(loginPageForRole("SUPER_ADMIN")).toBe("/admin/login");
    expect(loginPageForRole("LEARNER")).toBe("/anatomy/login");
    expect(loginPageForRole("STUDENT")).toBe("/login");
    expect(loginPageForRole("COORDINATOR")).toBe("/login");
    expect(loginPageForRole(undefined)).toBe("/login");
  });
});
