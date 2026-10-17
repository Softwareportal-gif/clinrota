import { readFileSync, readdirSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { parseStructuresCsv, validateSource, type SourceRow } from "@/lib/anatomy/source-format";

const FIXTURE = path.join(__dirname, "..", "fixtures", "anatomy-source");
const csv = () => readFileSync(path.join(FIXTURE, "structures.csv"), "utf8");
const meshIds = () => readdirSync(path.join(FIXTURE, "meshes")).map((f) => f.replace(/\.glb$/, ""));

describe("parseStructuresCsv", () => {
  it("reads the fixture into three rows with synonyms split on |", () => {
    const rows = parseStructuresCsv(csv());
    expect(rows).toHaveLength(3);
    expect(rows[1]).toEqual({
      id: "deltoid",
      name: "Deltoid",
      latin: "Musculus deltoideus",
      synonyms: ["Deltoid muscle", "Deltoideus"],
      system: "muscular",
      region: "upper-limb",
      parentId: null,
      fmaId: "32521",
    });
    expect(rows[2].synonyms).toEqual([]);
  });
});

describe("validateSource", () => {
  const rows = (): SourceRow[] => parseStructuresCsv(csv());

  it("accepts the fixture", () => {
    expect(validateSource(rows(), meshIds())).toEqual([]);
  });

  it("reports a row with no mesh", () => {
    expect(validateSource(rows(), meshIds().filter((id) => id !== "heart"))).toEqual(["missing mesh: heart"]);
  });

  it("reports a mesh with no row", () => {
    expect(validateSource(rows(), [...meshIds(), "femur"])).toEqual(["mesh without row: femur"]);
  });

  it("reports a duplicate id", () => {
    const r = rows();
    expect(validateSource([...r, { ...r[0] }], meshIds())).toEqual(["duplicate id: sternum"]);
  });

  it("reports an unknown system", () => {
    const r = rows();
    (r[0] as { system: string }).system = "x";
    expect(validateSource(r, meshIds())).toEqual(["unknown system 'x' for sternum"]);
  });

  it("reports an unknown parent", () => {
    const r = rows();
    r[0].parentId = "thorax-bones";
    expect(validateSource(r, meshIds())).toEqual(["unknown parent 'thorax-bones' for sternum"]);
  });

  it("reports an id that isn't lower-case letters, digits and hyphens", () => {
    const r = rows();
    r[0].id = "Sternum Bone";
    expect(validateSource(r, [...meshIds().filter((id) => id !== "sternum"), "Sternum Bone"])).toEqual([
      "invalid id: Sternum Bone",
    ]);
  });
});
