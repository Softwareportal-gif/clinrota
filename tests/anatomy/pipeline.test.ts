// @vitest-environment node
import { cpSync, mkdtempSync, readFileSync, rmSync, statSync } from "fs";
import os from "os";
import path from "path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NodeIO, type Document } from "@gltf-transform/core";
import { EXTMeshoptCompression, KHRMeshQuantization } from "@gltf-transform/extensions";
import { MeshoptDecoder } from "meshoptimizer";
import { LODS, parseCatalogue, type Catalogue } from "@/lib/anatomy/catalogue";
import { buildAnatomy } from "@/lib/anatomy/pipeline";

const FIXTURE = path.join(__dirname, "..", "fixtures", "anatomy-source");

let tmp: string;
let catalogue: Catalogue;
const modelDir = () => path.join(tmp, "out", "models", "v-test");

async function readGlb(file: string): Promise<Document> {
  await MeshoptDecoder.ready;
  const io = new NodeIO()
    .registerExtensions([EXTMeshoptCompression, KHRMeshQuantization])
    .registerDependencies({ "meshopt.decoder": MeshoptDecoder });
  return io.read(file);
}

const nodeNames = (doc: Document) =>
  doc
    .getRoot()
    .listNodes()
    .map((n) => n.getName())
    .sort();

const triangles = (doc: Document) =>
  doc
    .getRoot()
    .listMeshes()
    .flatMap((m) => m.listPrimitives())
    .reduce((sum, p) => sum + (p.getIndices()?.getCount() ?? 0) / 3, 0);

beforeAll(async () => {
  tmp = mkdtempSync(path.join(os.tmpdir(), "anatomy-build-"));
  catalogue = await buildAnatomy({ sourceDir: FIXTURE, outDir: path.join(tmp, "out"), version: "v-test" });
});

afterAll(() => rmSync(tmp, { recursive: true, force: true }));

describe("buildAnatomy", () => {
  it("writes a valid catalogue with every structure assigned to its chunk", () => {
    const written = parseCatalogue(JSON.parse(readFileSync(path.join(modelDir(), "catalogue.json"), "utf8")));
    expect(written).toEqual(catalogue);
    expect(written.version).toBe("v-test");
    expect(written.structures).toHaveLength(3);
    for (const s of written.structures) expect(s.chunk).toBe(`${s.system}/${s.region}`);
    expect(written.chunks.map((c) => c.id).sort()).toEqual([
      "cardiovascular/thorax",
      "muscular/upper-limb",
      "skeletal/thorax",
    ]);
  });

  it("gives each structure the bounding box of its mesh", () => {
    const heart = catalogue.structures.find((s) => s.id === "heart")!;
    const expected = [-0.1, 1.18, -0.02, 0.04, 1.32, 0.12];
    heart.bbox.forEach((v, i) => expect(v).toBeCloseTo(expected[i], 3));
  });

  it("writes every chunk at every detail level, plus the overview, with sizes matching the files", () => {
    for (const chunk of catalogue.chunks) {
      for (const lod of LODS) {
        const file = path.join(modelDir(), "chunks", chunk.id, `${lod}.glb`);
        expect(chunk.bytes[lod]).toBe(statSync(file).size);
      }
    }
    expect(catalogue.overviewBytes).toBe(statSync(path.join(modelDir(), "overview.glb")).size);
  });

  it("names one node per structure in each chunk", async () => {
    for (const chunk of catalogue.chunks) {
      const ids = catalogue.structures.filter((s) => s.chunk === chunk.id).map((s) => s.id);
      for (const lod of LODS) {
        const doc = await readGlb(path.join(modelDir(), "chunks", chunk.id, `${lod}.glb`));
        expect(nodeNames(doc)).toEqual(ids.sort());
      }
    }
  });

  it("simplifies the lower detail levels", async () => {
    const counts = await Promise.all(
      LODS.map(async (lod) => triangles(await readGlb(path.join(modelDir(), "chunks", "skeletal", "thorax", `${lod}.glb`))))
    );
    const [low, medium, high] = counts;
    expect(low).toBeLessThan(medium);
    expect(medium).toBeLessThanOrEqual(high);
  });

  it("puts only the overview systems in the overview", async () => {
    const doc = await readGlb(path.join(modelDir(), "overview.glb"));
    expect(nodeNames(doc)).toEqual(["deltoid", "sternum"]);
  });

  it("rejects an invalid source with the validator's messages", async () => {
    const broken = path.join(tmp, "broken");
    cpSync(FIXTURE, broken, { recursive: true });
    rmSync(path.join(broken, "meshes", "heart.glb"));
    await expect(buildAnatomy({ sourceDir: broken, outDir: path.join(tmp, "out2"), version: "v1" })).rejects.toThrow(
      "missing mesh: heart"
    );
  });
});
