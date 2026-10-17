// Turns an anatomy-source/ folder (see source-format.ts) into what the Body
// Explorer downloads: one .glb per chunk (system + region) per detail level,
// a light overview model for first paint, and catalogue.json.
//
//   <outDir>/models/<version>/chunks/<system>/<region>/<lod>.glb
//   <outDir>/models/<version>/overview.glb
//   <outDir>/models/<version>/catalogue.json
//
// Every structure is one node named exactly its id, so the viewer can pick,
// hide and highlight it by id. Run through scripts/anatomy/build.ts.
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "fs";
import path from "path";
import { Document, Logger, NodeIO, type Primitive } from "@gltf-transform/core";
import { EXTMeshoptCompression, KHRMeshQuantization } from "@gltf-transform/extensions";
import { meshopt, simplify, transformMesh, weld } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";
import { LODS, type AnatomySystem, type Bbox, type Catalogue, type Chunk, type Lod, type Structure } from "./catalogue";
import { parseStructuresCsv, validateSource, type SourceRow } from "./source-format";

// Share of vertices kept at each detail level. Overwrite with Task 0 findings.
export const SIMPLIFY_RATIO: Record<Lod, number> = { low: 0.1, medium: 0.35, high: 1 };
export const OVERVIEW_SYSTEMS: AnatomySystem[] = ["integumentary", "skeletal"];
export const OVERVIEW_RATIO = 0.05;

// Let the ratio, not an error cap, decide how far each level is simplified.
const SIMPLIFY_ERROR = 1;

type Geometry = { positions: Float32Array; normals: Float32Array | null; indices: Uint32Array };
type Loaded = { row: SourceRow; parts: Geometry[]; bbox: Bbox };

async function createIo() {
  await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready, MeshoptSimplifier.ready]);
  return new NodeIO()
    .registerExtensions([EXTMeshoptCompression, KHRMeshQuantization])
    .registerDependencies({ "meshopt.encoder": MeshoptEncoder, "meshopt.decoder": MeshoptDecoder });
}

// Reads one structure's mesh file, baking node transforms into the vertices
// so every part sits where it does in the body.
async function loadStructure(io: NodeIO, file: string, row: SourceRow): Promise<Loaded> {
  const doc = await io.read(file);
  const parts: Geometry[] = [];
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const node of doc.getRoot().listNodes()) {
    const source = node.getMesh();
    if (!source) continue;
    const mesh = source.clone();
    transformMesh(mesh, node.getWorldMatrix());
    for (const prim of mesh.listPrimitives()) {
      const position = prim.getAttribute("POSITION");
      if (!position) continue;
      const positions = new Float32Array(position.getCount() * 3);
      const el: number[] = [];
      for (let i = 0; i < position.getCount(); i++) {
        position.getElement(i, el);
        for (let k = 0; k < 3; k++) {
          positions[i * 3 + k] = el[k];
          min[k] = Math.min(min[k], el[k]);
          max[k] = Math.max(max[k], el[k]);
        }
      }
      const normal = prim.getAttribute("NORMAL");
      let normalArray: Float32Array | null = null;
      if (normal) {
        normalArray = new Float32Array(normal.getCount() * 3);
        for (let i = 0; i < normal.getCount(); i++) {
          normal.getElement(i, el);
          normalArray.set(el.slice(0, 3), i * 3);
        }
      }
      const index = prim.getIndices();
      const indices = index
        ? Uint32Array.from({ length: index.getCount() }, (_, i) => index.getScalar(i))
        : Uint32Array.from({ length: position.getCount() }, (_, i) => i);
      parts.push({ positions, normals: normalArray, indices });
    }
  }
  if (!parts.length) throw new Error(`no triangles in mesh: ${row.id}`);
  return { row, parts, bbox: [min[0], min[1], min[2], max[0], max[1], max[2]] };
}

// Averages the face normals around each vertex, keeping the mesh indexed
// (gltf-transform's normals() unwelds it into flat shading).
function addSmoothNormals(doc: Document, prim: Primitive) {
  const position = prim.getAttribute("POSITION")!;
  const index = prim.getIndices()!;
  const p = position.getArray() as Float32Array;
  const n = new Float32Array(p.length);
  for (let t = 0; t < index.getCount(); t += 3) {
    const [a, b, c] = [index.getScalar(t), index.getScalar(t + 1), index.getScalar(t + 2)];
    const e1 = [0, 1, 2].map((k) => p[b * 3 + k] - p[a * 3 + k]);
    const e2 = [0, 1, 2].map((k) => p[c * 3 + k] - p[a * 3 + k]);
    const face = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    for (const v of [a, b, c]) for (let k = 0; k < 3; k++) n[v * 3 + k] += face[k];
  }
  for (let v = 0; v < n.length; v += 3) {
    const len = Math.hypot(n[v], n[v + 1], n[v + 2]) || 1;
    n[v] /= len;
    n[v + 1] /= len;
    n[v + 2] /= len;
  }
  prim.setAttribute("NORMAL", doc.createAccessor().setType("VEC3").setArray(n).setBuffer(position.getBuffer()));
}

// One .glb holding the given structures, simplified to `ratio`.
async function writeModel(io: NodeIO, items: Loaded[], ratio: number, file: string): Promise<number> {
  const doc = new Document().setLogger(new Logger(Logger.Verbosity.WARN));
  const buffer = doc.createBuffer();
  const scene = doc.createScene();
  for (const { row, parts } of items) {
    const mesh = doc.createMesh(row.id);
    for (const part of parts) {
      const prim = doc
        .createPrimitive()
        .setAttribute("POSITION", doc.createAccessor().setType("VEC3").setArray(part.positions.slice()).setBuffer(buffer))
        .setIndices(doc.createAccessor().setType("SCALAR").setArray(part.indices.slice()).setBuffer(buffer));
      if (part.normals) {
        prim.setAttribute("NORMAL", doc.createAccessor().setType("VEC3").setArray(part.normals.slice()).setBuffer(buffer));
      }
      mesh.addPrimitive(prim);
    }
    scene.addChild(doc.createNode(row.id).setMesh(mesh));
  }

  await doc.transform(weld());
  if (ratio < 1) {
    await doc.transform(simplify({ simplifier: MeshoptSimplifier, ratio, error: SIMPLIFY_ERROR }));
  }
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) if (!prim.getAttribute("NORMAL")) addSmoothNormals(doc, prim);
  }
  await doc.transform(meshopt({ encoder: MeshoptEncoder, level: "medium" }));

  const bytes = await io.writeBinary(doc);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, bytes);
  return bytes.byteLength;
}

export async function buildAnatomy(opts: { sourceDir: string; outDir: string; version: string }): Promise<Catalogue> {
  const { sourceDir, outDir, version } = opts;
  const rows = parseStructuresCsv(readFileSync(path.join(sourceDir, "structures.csv"), "utf8"));
  const meshIds = readdirSync(path.join(sourceDir, "meshes"))
    .filter((f) => f.endsWith(".glb"))
    .map((f) => f.slice(0, -".glb".length));
  const errors = validateSource(rows, meshIds);
  if (errors.length) throw new Error(`Invalid anatomy source:\n${errors.join("\n")}`);

  const io = await createIo();
  const loaded: Loaded[] = [];
  for (const row of rows) loaded.push(await loadStructure(io, path.join(sourceDir, "meshes", `${row.id}.glb`), row));

  const modelDir = path.join(outDir, "models", version);
  const byChunk = new Map<string, Loaded[]>();
  for (const item of loaded) {
    const id = `${item.row.system}/${item.row.region}`;
    byChunk.set(id, [...(byChunk.get(id) ?? []), item]);
  }

  const chunks: Chunk[] = [];
  for (const [id, items] of [...byChunk].sort(([a], [b]) => a.localeCompare(b))) {
    const bytes = {} as Record<Lod, number>;
    for (const lod of LODS) {
      bytes[lod] = await writeModel(io, items, SIMPLIFY_RATIO[lod], path.join(modelDir, "chunks", id, `${lod}.glb`));
    }
    chunks.push({ id, system: items[0].row.system, region: items[0].row.region, bytes });
  }

  const overviewItems = loaded.filter((item) => OVERVIEW_SYSTEMS.includes(item.row.system));
  const overviewBytes = await writeModel(io, overviewItems, OVERVIEW_RATIO, path.join(modelDir, "overview.glb"));

  const structures: Structure[] = loaded.map(({ row, bbox }) => ({
    ...row,
    chunk: `${row.system}/${row.region}`,
    bbox,
  }));
  const catalogue: Catalogue = { version, overviewBytes, structures, chunks };
  writeFileSync(path.join(modelDir, "catalogue.json"), JSON.stringify(catalogue));
  return catalogue;
}
