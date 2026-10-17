// Search for the Body Explorer's search box: matches structure names, Latin
// names and synonyms, best matches first.
import type { Catalogue, Structure } from "./catalogue";

type Indexed = { structure: Structure; fields: string[] };

const normalise = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const indexCache = new WeakMap<Catalogue, Indexed[]>();

function indexOf(catalogue: Catalogue): Indexed[] {
  let index = indexCache.get(catalogue);
  if (!index) {
    index = catalogue.structures.map((structure) => ({
      structure,
      fields: [structure.name, structure.latin, ...structure.synonyms].filter((f): f is string => !!f).map(normalise),
    }));
    indexCache.set(catalogue, index);
  }
  return index;
}

// 0 exact, 1 starts with the query, 2 a word starts with it, 3 contains it.
function rankField(field: string, query: string): number | null {
  if (field === query) return 0;
  if (field.startsWith(query)) return 1;
  if (field.includes(` ${query}`)) return 2;
  if (field.includes(query)) return 3;
  return null;
}

export function searchStructures(catalogue: Catalogue, query: string, limit = 10): Structure[] {
  const q = normalise(query);
  if (!q) return [];
  const matches: { structure: Structure; rank: number }[] = [];
  for (const { structure, fields } of indexOf(catalogue)) {
    const ranks = fields.map((f) => rankField(f, q)).filter((r): r is number => r !== null);
    if (ranks.length) matches.push({ structure, rank: Math.min(...ranks) });
  }
  matches.sort(
    (a, b) =>
      a.rank - b.rank ||
      a.structure.name.length - b.structure.name.length ||
      a.structure.name.localeCompare(b.structure.name)
  );
  return matches.slice(0, limit).map((m) => m.structure);
}
