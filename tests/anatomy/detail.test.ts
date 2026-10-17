import { describe, expect, it } from "vitest";
import { preferredLod } from "@/lib/anatomy/detail";

describe("preferredLod", () => {
  it("stays on low detail with data saver on", () => {
    expect(preferredLod({ saveData: true, deviceMemory: 16, screenWidth: 1920, screenHeight: 1080 })).toBe("low");
  });

  it("gives phones and tablets medium detail", () => {
    expect(preferredLod({ deviceMemory: 4, screenWidth: 412, screenHeight: 915 })).toBe("medium");
    expect(preferredLod({ screenWidth: 390, screenHeight: 844 })).toBe("medium");
    expect(preferredLod({ deviceMemory: 8, screenWidth: 768, screenHeight: 1024 })).toBe("medium");
  });

  it("gives laptops high detail unless memory is short", () => {
    expect(preferredLod({ deviceMemory: 8, screenWidth: 1366, screenHeight: 768 })).toBe("medium");
    expect(preferredLod({ deviceMemory: 8, screenWidth: 1920, screenHeight: 1080 })).toBe("high");
    expect(preferredLod({ screenWidth: 1440, screenHeight: 900 })).toBe("high");
    expect(preferredLod({ deviceMemory: 4, screenWidth: 1920, screenHeight: 1080 })).toBe("medium");
  });
});
