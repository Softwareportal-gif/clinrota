import { describe, expect, it } from "vitest";
import type { Catalogue, Structure } from "@/lib/anatomy/catalogue";
import { searchStructures } from "@/lib/anatomy/search";

function structure(id: string, name: string, extra: Partial<Structure> = {}): Structure {
  return {
    id,
    name,
    latin: null,
    synonyms: [],
    system: "skeletal",
    region: "thorax",
    parentId: null,
    fmaId: null,
    chunk: "skeletal/thorax",
    bbox: [0, 0, 0, 1, 1, 1],
    ...extra,
  };
}

const catalogue: Catalogue = {
  version: "v1",
  overviewBytes: 1,
  chunks: [{ id: "skeletal/thorax", system: "skeletal", region: "thorax", bytes: { low: 1, medium: 1, high: 1 } }],
  structures: [
    structure("sternocleidomastoid", "Sternocleidomastoid", { system: "muscular", latin: "Musculus sternocleidomastoideus" }),
    structure("manubrium-of-sternum", "Manubrium of sternum"),
    structure("femur", "Femur", { latin: "Os femoris", region: "lower-limb" }),
    structure("sternum", "Sternum", { latin: "Sternum", synonyms: ["Breastbone"] }),
  ],
};

const ids = (query: string, limit?: number) => searchStructures(catalogue, query, limit).map((s) => s.id);

describe("searchStructures", () => {
  it("ranks an exact match, then name prefixes, then word prefixes", () => {
    expect(ids("stern")).toEqual(["sternum", "sternocleidomastoid", "manubrium-of-sternum"]);
    expect(ids("sternum")).toEqual(["sternum", "manubrium-of-sternum"]);
  });

  it("matches synonyms and Latin names", () => {
    expect(ids("breastbone")).toEqual(["sternum"]);
    expect(ids("os femoris")).toEqual(["femur"]);
    expect(ids("musculus")).toEqual(["sternocleidomastoid"]);
  });

  it("ignores case, accents and extra spaces", () => {
    expect(ids("  STÉRNUM ")[0]).toBe("sternum");
    expect(ids("os   femoris")).toEqual(["femur"]);
  });

  it("finds substrings last", () => {
    expect(ids("cleido")).toEqual(["sternocleidomastoid"]);
  });

  it("returns nothing for no match or an empty query", () => {
    expect(ids("xyz")).toEqual([]);
    expect(ids("")).toEqual([]);
    expect(ids("   ")).toEqual([]);
  });

  it("puts a muscle before the fascia wrapping it", () => {
    const withWrappings: Catalogue = {
      ...catalogue,
      structures: [
        structure("deltoid-fascia", "Deltoid fascia", { system: "muscular" }),
        structure("deltoid-muscle", "Deltoid muscle", { system: "muscular" }),
      ],
    };
    expect(searchStructures(withWrappings, "deltoid").map((s) => s.id)).toEqual(["deltoid-muscle", "deltoid-fascia"]);
  });

  it("honours the limit", () => {
    expect(ids("stern", 1)).toEqual(["sternum"]);
  });
});
