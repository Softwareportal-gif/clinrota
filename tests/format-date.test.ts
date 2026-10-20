import { describe, expect, it } from "vitest";
import { formatDate, formatDateRange, formatDateTime, toDateInputValue } from "@/lib/format-date";

describe("formatDate", () => {
  it("writes day, short month and year (Ghana style, unambiguous)", () => {
    expect(formatDate(new Date("2026-10-01T00:00:00Z"))).toBe("1 Oct 2026");
  });

  it("uses the same three-letter months everywhere (never 'Sept')", () => {
    expect(formatDate("2026-09-10T00:00:00Z")).toBe("10 Sep 2026");
    expect(formatDate("2026-06-30T23:59:00Z")).toBe("30 Jun 2026");
  });

  it("shows a dash for nothing or nonsense", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate("not a date")).toBe("—");
  });
});

describe("formatDateTime", () => {
  it("adds a 24-hour time without seconds", () => {
    expect(formatDateTime(new Date("2026-09-21T00:00:20Z"))).toBe("21 Sep 2026, 00:00");
    expect(formatDateTime(new Date("2026-09-21T14:05:00Z"))).toBe("21 Sep 2026, 14:05");
  });
});

describe("formatDateRange", () => {
  it("joins two dates with an en dash", () => {
    expect(formatDateRange(new Date("2026-09-01T00:00:00Z"), new Date("2026-11-01T00:00:00Z"))).toBe("1 Sep 2026 – 1 Nov 2026");
  });
});

describe("toDateInputValue", () => {
  it("gives the yyyy-mm-dd a date input needs", () => {
    expect(toDateInputValue(new Date("2026-09-01T00:00:00Z"))).toBe("2026-09-01");
  });
});
