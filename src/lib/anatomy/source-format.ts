// The intermediate format between the Z-Anatomy export
// (scripts/anatomy/export-z-anatomy.py) and the build pipeline
// (src/lib/anatomy/pipeline.ts): a folder holding structures.csv and
// meshes/<id>.glb, one mesh per structure, in metres, Y up, body facing +Z.
import Papa from "papaparse";
import { SYSTEMS, type AnatomySystem } from "@/lib/anatomy/catalogue";

export type SourceRow = {
  id: string;
  name: string;
  latin: string | null;
  synonyms: string[];
  system: AnatomySystem;
  region: string;
  parentId: string | null;
  fmaId: string | null;
};

export const CSV_HEADER = ["id", "name", "latin", "synonyms", "system", "region", "parent_id", "fma_id"] as const;

const ID_PATTERN = /^[a-z0-9-]+$/;
const orNull = (value: string | undefined) => (value && value.trim() ? value.trim() : null);

export function parseStructuresCsv(csv: string): SourceRow[] {
  const { data } = Papa.parse<Record<string, string>>(csv.trim(), { header: true, skipEmptyLines: true });
  return data.map((r) => ({
    id: (r.id ?? "").trim(),
    name: (r.name ?? "").trim(),
    latin: orNull(r.latin),
    synonyms: (r.synonyms ?? "")
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean),
    system: (r.system ?? "").trim() as AnatomySystem,
    region: (r.region ?? "").trim(),
    parentId: orNull(r.parent_id),
    fmaId: orNull(r.fma_id),
  }));
}

// Every problem with the export, one message each, naming the structure.
export function validateSource(rows: SourceRow[], meshIds: string[]): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const row of rows) {
    if (ids.has(row.id)) errors.push(`duplicate id: ${row.id}`);
    ids.add(row.id);
  }
  const meshes = new Set(meshIds);
  for (const row of rows) {
    if (!ID_PATTERN.test(row.id)) errors.push(`invalid id: ${row.id}`);
    if (!(SYSTEMS as readonly string[]).includes(row.system)) errors.push(`unknown system '${row.system}' for ${row.id}`);
    if (row.parentId && !ids.has(row.parentId)) errors.push(`unknown parent '${row.parentId}' for ${row.id}`);
  }
  for (const id of ids) if (!meshes.has(id)) errors.push(`missing mesh: ${id}`);
  for (const id of meshes) if (!ids.has(id)) errors.push(`mesh without row: ${id}`);
  return errors;
}
