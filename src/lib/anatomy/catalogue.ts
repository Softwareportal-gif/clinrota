// The anatomy catalogue: every structure in the 3D atlas, which body
// system and region it belongs to, and which model chunk holds its mesh.
// Built by the anatomy pipeline (scripts/anatomy/build.ts) and read by the
// Body Explorer for search, the systems drawer and the info cards.

export const SYSTEMS = [
  "integumentary",
  "muscular",
  "skeletal",
  "cardiovascular",
  "respiratory",
  "nervous",
  "digestive",
  "urinary",
  "reproductive",
  "lymphatic",
  "endocrine",
] as const;
export type AnatomySystem = (typeof SYSTEMS)[number];

// Outermost first: the depth slider peels the body from skin to bone.
export const DEPTH_LEVELS = ["skin", "muscle", "organs", "bone"] as const;
export type DepthLevel = (typeof DEPTH_LEVELS)[number];

export const LODS = ["low", "medium", "high"] as const;
export type Lod = (typeof LODS)[number];

export function layerOf(system: AnatomySystem): DepthLevel {
  if (system === "integumentary") return "skin";
  if (system === "muscular") return "muscle";
  if (system === "skeletal") return "bone";
  return "organs";
}

export type Bbox = [number, number, number, number, number, number]; // minX,minY,minZ,maxX,maxY,maxZ

export type Structure = {
  id: string;
  name: string;
  latin: string | null;
  synonyms: string[];
  system: AnatomySystem;
  region: string;
  parentId: string | null;
  fmaId: string | null;
  chunk: string; // "<system>/<region>"
  bbox: Bbox;
};

export type Chunk = { id: string; system: AnatomySystem; region: string; bytes: Record<Lod, number> };

export type Catalogue = { version: string; overviewBytes: number; structures: Structure[]; chunks: Chunk[] };

const isString = (v: unknown): v is string => typeof v === "string";
const isNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isSystem = (v: unknown): v is AnatomySystem => (SYSTEMS as readonly unknown[]).includes(v);
const isNullableString = (v: unknown) => v === null || isString(v);

function fail(reason: string): never {
  throw new Error(`Invalid catalogue: ${reason}`);
}

// Checks the shape of a fetched catalogue before the viewer trusts it.
export function parseCatalogue(json: unknown): Catalogue {
  const c = json as Partial<Catalogue> | null;
  if (!c || typeof c !== "object") fail("not an object");
  if (!isString(c.version)) fail("missing version");
  if (!isNumber(c.overviewBytes)) fail("missing overviewBytes");
  if (!Array.isArray(c.structures) || !Array.isArray(c.chunks)) fail("missing structures or chunks");

  const chunkIds = new Set<string>();
  for (const chunk of c.chunks) {
    if (!chunk || !isString(chunk.id) || !isSystem(chunk.system) || !isString(chunk.region)) {
      fail(`bad chunk ${JSON.stringify(chunk?.id)}`);
    }
    if (!chunk.bytes || !isNumber(chunk.bytes.low) || !isNumber(chunk.bytes.medium) || !isNumber(chunk.bytes.high)) {
      fail(`bad sizes for chunk ${chunk.id}`);
    }
    chunkIds.add(chunk.id);
  }

  const ids = new Set<string>();
  for (const s of c.structures) {
    if (!s || !isString(s.id) || !isString(s.name)) fail("structure without id or name");
    if (ids.has(s.id)) fail(`duplicate id ${s.id}`);
    ids.add(s.id);
    if (!isSystem(s.system)) fail(`unknown system ${JSON.stringify(s.system)} for ${s.id}`);
    if (!isString(s.region)) fail(`missing region for ${s.id}`);
    if (!isNullableString(s.latin) || !isNullableString(s.parentId) || !isNullableString(s.fmaId)) {
      fail(`bad optional field for ${s.id}`);
    }
    if (!Array.isArray(s.synonyms) || !s.synonyms.every(isString)) fail(`bad synonyms for ${s.id}`);
    if (!chunkIds.has(s.chunk)) fail(`unknown chunk ${JSON.stringify(s.chunk)} for ${s.id}`);
    if (!Array.isArray(s.bbox) || s.bbox.length !== 6 || !s.bbox.every(isNumber)) fail(`bad bbox for ${s.id}`);
  }

  return c as Catalogue;
}
