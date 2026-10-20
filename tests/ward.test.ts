import { describe, expect, it } from "vitest";
import { normalizeWardName, wardOptions, WARD_NAME_MAX } from "@/lib/ward";

describe("normalizeWardName", () => {
  it("trims and collapses spaces", () => {
    expect(normalizeWardName("  Labour   Ward ")).toBe("Labour Ward");
  });

  it.each([undefined, null, "", "   "])("treats %j as no ward", (value) => {
    expect(normalizeWardName(value)).toBeNull();
  });

  it("caps very long names", () => {
    expect(normalizeWardName("x".repeat(200))).toHaveLength(WARD_NAME_MAX);
  });
});

describe("wardOptions", () => {
  it("lists the site's wards in order, without duplicates", () => {
    expect(wardOptions(["Surgical Ward", "Labour Ward", "labour ward", " OPD "])).toEqual(["Labour Ward", "OPD", "Surgical Ward"]);
  });

  it("is empty when the site has no wards listed", () => {
    expect(wardOptions([])).toEqual([]);
  });
});
