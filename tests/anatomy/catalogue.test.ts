import { describe, expect, it } from "vitest";
import { layerOf, parseCatalogue, type Catalogue } from "@/lib/anatomy/catalogue";

function validCatalogue(): Catalogue {
  return {
    version: "v1",
    overviewBytes: 1000,
    structures: [
      {
        id: "sternum",
        name: "Sternum",
        latin: "Sternum",
        synonyms: ["Breastbone"],
        system: "skeletal",
        region: "thorax",
        parentId: null,
        fmaId: "7485",
        chunk: "skeletal/thorax",
        bbox: [-0.05, 1.2, 0.05, 0.05, 1.45, 0.12],
      },
    ],
    chunks: [{ id: "skeletal/thorax", system: "skeletal", region: "thorax", bytes: { low: 10, medium: 20, high: 30 } }],
  };
}

describe("layerOf", () => {
  it("puts each system in its depth layer", () => {
    expect(layerOf("integumentary")).toBe("skin");
    expect(layerOf("muscular")).toBe("muscle");
    expect(layerOf("skeletal")).toBe("bone");
    expect(layerOf("nervous")).toBe("organs");
  });
});

describe("parseCatalogue", () => {
  it("accepts a minimal valid catalogue", () => {
    const catalogue = validCatalogue();
    expect(parseCatalogue(JSON.parse(JSON.stringify(catalogue)))).toEqual(catalogue);
  });

  it("rejects an unknown system", () => {
    const c = validCatalogue() as unknown as { structures: { system: string }[] };
    c.structures[0].system = "bones";
    expect(() => parseCatalogue(c)).toThrow(/Invalid catalogue/);
  });

  it("rejects a structure whose chunk is not listed", () => {
    const c = validCatalogue();
    c.structures[0].chunk = "skeletal/pelvis";
    expect(() => parseCatalogue(c)).toThrow(/Invalid catalogue/);
  });

  it("rejects a duplicate structure id", () => {
    const c = validCatalogue();
    c.structures.push({ ...c.structures[0] });
    expect(() => parseCatalogue(c)).toThrow(/Invalid catalogue/);
  });

  it("rejects a bounding box without six numbers", () => {
    const c = validCatalogue() as unknown as { structures: { bbox: number[] }[] };
    c.structures[0].bbox = [0, 0, 0, 1, 1];
    expect(() => parseCatalogue(c)).toThrow(/Invalid catalogue/);
  });
});
