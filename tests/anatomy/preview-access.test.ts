import { afterEach, describe, expect, it, vi } from "vitest";
import { isAnatomyOpenTo, isAnatomyPreviewEnabled } from "@/lib/anatomy/preview-access";

afterEach(() => vi.unstubAllEnvs());

describe("isAnatomyPreviewEnabled", () => {
  it("is off when ANATOMY_PREVIEW is unset", () => {
    vi.stubEnv("ANATOMY_PREVIEW", undefined);
    vi.stubEnv("ANATOMY_PREVIEW_EMAILS", "tester@example.com");
    expect(isAnatomyPreviewEnabled("tester@example.com")).toBe(false);
  });

  it("is off when ANATOMY_PREVIEW is not exactly true", () => {
    vi.stubEnv("ANATOMY_PREVIEW", "false");
    vi.stubEnv("ANATOMY_PREVIEW_EMAILS", "tester@example.com");
    expect(isAnatomyPreviewEnabled("tester@example.com")).toBe(false);
  });

  it("is off for an email that isn't listed, or no email", () => {
    vi.stubEnv("ANATOMY_PREVIEW", "true");
    vi.stubEnv("ANATOMY_PREVIEW_EMAILS", "tester@example.com");
    expect(isAnatomyPreviewEnabled("someone@example.com")).toBe(false);
    expect(isAnatomyPreviewEnabled(null)).toBe(false);
    expect(isAnatomyPreviewEnabled(undefined)).toBe(false);
    expect(isAnatomyPreviewEnabled("")).toBe(false);
  });

  it("is off when no emails are listed", () => {
    vi.stubEnv("ANATOMY_PREVIEW", "true");
    vi.stubEnv("ANATOMY_PREVIEW_EMAILS", undefined);
    expect(isAnatomyPreviewEnabled("tester@example.com")).toBe(false);
  });

  it("matches listed emails ignoring case and spaces", () => {
    vi.stubEnv("ANATOMY_PREVIEW", "true");
    vi.stubEnv("ANATOMY_PREVIEW_EMAILS", "tester@example.com, other@x.com");
    expect(isAnatomyPreviewEnabled(" Tester@Example.com ")).toBe(true);
    expect(isAnatomyPreviewEnabled("other@x.com")).toBe(true);
  });
});

describe("isAnatomyOpenTo", () => {
  it("opens to everyone once public", () => {
    vi.stubEnv("ANATOMY_PUBLIC", "true");
    vi.stubEnv("ANATOMY_PREVIEW", undefined);
    expect(isAnatomyOpenTo("anyone@example.com")).toBe(true);
  });

  it("falls back to the preview list before launch", () => {
    vi.stubEnv("ANATOMY_PUBLIC", undefined);
    vi.stubEnv("ANATOMY_PREVIEW", "true");
    vi.stubEnv("ANATOMY_PREVIEW_EMAILS", "tester@example.com");
    expect(isAnatomyOpenTo("tester@example.com")).toBe(true);
    expect(isAnatomyOpenTo("anyone@example.com")).toBe(false);
  });
});
