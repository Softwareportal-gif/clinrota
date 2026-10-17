import { describe, expect, it } from "vitest";
import { framingFor } from "@/lib/anatomy/camera";
import type { Bbox } from "@/lib/anatomy/catalogue";

const BOX: Bbox = [-1, 0, -1, 1, 2, 1];
const tanHalf = Math.tan(((50 / 2) * Math.PI) / 180);

describe("framingFor", () => {
  it("aims at the centre of the box from the front", () => {
    const { position, target } = framingFor(BOX, 50, 1);
    expect(target).toEqual([0, 1, 0]);
    expect(position[0]).toBe(0);
    expect(position[1]).toBe(1);
    expect(position[2]).toBeGreaterThan(1);
  });

  it("backs off just far enough for the box and margin to fill the view", () => {
    const { position } = framingFor(BOX, 50, 1, 1.4);
    const fromFrontFace = position[2] - 1;
    expect((2 * 1.4) / 2 / fromFrontFace).toBeCloseTo(tanHalf, 6);
  });

  it("never moves further away on a wider screen", () => {
    expect(framingFor(BOX, 50, 2).position[2]).toBeLessThanOrEqual(framingFor(BOX, 50, 1).position[2]);
  });

  it("moves further away on a narrow phone screen so the width fits", () => {
    const narrow = framingFor(BOX, 50, 0.5, 1.4);
    const fromFrontFace = narrow.position[2] - 1;
    const tanHalfHorizontal = tanHalf * 0.5;
    expect((2 * 1.4) / 2 / fromFrontFace).toBeCloseTo(tanHalfHorizontal, 6);
  });
});
