// Study-card content for each structure, built offline from Z-Anatomy's
// descriptions (adapted from Wikipedia, CC BY-SA 4.0) plus quick facts read
// from the matching Wikipedia infobox. Nothing here is expert-reviewed yet;
// cards say so until Praxxt's clinicians approve them (spec §4.4).

export type ContentBlock =
  | { kind: "paragraph"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "subheading"; text: string };
export type ContentSection = { heading: string; blocks: ContentBlock[] };
export type Fact = { label: string; value: string };

export type StructureContent = {
  id: string;
  sourceTitle: string; // the article the text comes from
  exact: boolean; // false when it's the general article for a sub-part
  summary: string[];
  facts: Fact[];
  factsFrom: string | null; // set when the facts are the whole structure's, for one of its parts
  sections: ContentSection[];
  reviewed: boolean;
  credit: { text: string; licence: string; url: string };
};

// Wikipedia sections that don't belong on a study card.
const DROPPED_SECTIONS = new Set([
  "references",
  "external links",
  "notes",
  "see also",
  "further reading",
  "bibliography",
  "sources",
  "other animals",
  "society and culture",
  "gallery",
  "additional images",
]);

const HEADING = /^(=+)\s*(.+?)\s*=+\s*$/;

function titleCase(line: string) {
  const t = line.trim();
  return t === t.toUpperCase() ? t.charAt(0) + t.slice(1).toLowerCase() : t;
}

// Blank-line separated paragraphs; "-" lines become a list.
function toBlocks(lines: string[]): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  let paragraph: string[] = [];
  const flush = () => {
    // Some source sentences run together ("skiing.The"); put the space back.
    if (paragraph.length) blocks.push({ kind: "paragraph", text: paragraph.join(" ").replace(/([a-z)]\.)([A-Z])/g, "$1 $2").trim() });
    paragraph = [];
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flush();
    } else if (/^[-•*]\s*/.test(line)) {
      flush();
      const item = line.replace(/^[-•*]\s*/, "");
      const last = blocks[blocks.length - 1];
      if (last?.kind === "list") last.items.push(item);
      else blocks.push({ kind: "list", items: [item] });
    } else {
      paragraph.push(line);
    }
  }
  flush();
  return blocks;
}

export function parseDescription(text: string): { title: string; summary: string[]; sections: ContentSection[] } {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const first = lines.findIndex((l) => l.trim());
  const title = first >= 0 ? titleCase(lines[first]) : "";
  const body = lines.slice(first + 1);

  const intro: string[] = [];
  const sections: { heading: string; lines: string[] }[] = [];
  for (const line of body) {
    const h = HEADING.exec(line.trim());
    if (h && h[1].length === 2) {
      sections.push({ heading: h[2], lines: [] });
    } else if (h && sections.length) {
      sections[sections.length - 1].lines.push("", `\u0000${h[2]}`, "");
    } else if (sections.length) {
      sections[sections.length - 1].lines.push(line);
    } else {
      intro.push(line);
    }
  }

  const summary = toBlocks(intro).flatMap((b) => (b.kind === "paragraph" ? [b.text] : b.kind === "list" ? b.items : []));
  return {
    title,
    summary,
    sections: sections
      .filter((s) => !DROPPED_SECTIONS.has(s.heading.toLowerCase()))
      .map((s) => ({
        heading: s.heading,
        blocks: toBlocks(s.lines).map((b) =>
          b.kind === "paragraph" && b.text.startsWith("\u0000") ? { kind: "subheading" as const, text: b.text.slice(1) } : b
        ),
      }))
      .filter((s) => s.blocks.length > 0),
  };
}

const normalise = (s: string) =>
  s
    .toLowerCase()
    .replace(/[()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const withoutSide = (name: string) => name.replace(/\s*\((left|right)\)\s*$/i, "");
// Too vague to stand in for a sub-part on their own.
const GENERIC = new Set(["body", "head", "neck", "base", "apex", "arch", "root", "lobe", "part", "region", "surface", "border"]);
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

type MatchIndex = { exact: Map<string, string>; candidates: { name: string; pattern: RegExp; length: number }[] };
const indexCache = new WeakMap<string[], MatchIndex>();

function indexFor(names: string[]): MatchIndex {
  let index = indexCache.get(names);
  if (!index) {
    const exact = new Map<string, string>();
    const candidates: MatchIndex["candidates"] = [];
    for (const name of names) {
      const n = normalise(name);
      if (!exact.has(n)) exact.set(n, name);
      if (n.length >= 3 && !GENERIC.has(n)) candidates.push({ name, pattern: new RegExp(`\\b${escape(n)}\\b`), length: n.length });
    }
    candidates.sort((a, b) => b.length - a.length);
    index = { exact, candidates };
    indexCache.set(names, index);
  }
  return index;
}

// The description for a structure: its own, or else the longest general one
// its name contains ("Costal cartilage of first rib" → "Costal cartilage").
export function matchDescription(structureName: string, names: string[]): { name: string; exact: boolean } | null {
  const { exact, candidates } = indexFor(names);
  const base = normalise(withoutSide(structureName));
  const own = exact.get(base);
  if (own) return { name: own, exact: true };
  const general = candidates.find((c) => c.pattern.test(base));
  return general ? { name: general.name, exact: false } : null;
}

// Strips a template, link or tag wrapper, innermost first.
function stripTemplates(text: string) {
  let out = text;
  for (let i = 0; i < 10 && out.includes("{{"); i++) {
    out = out.replace(/\{\{\s*(?:ubl|unbulleted list|plainlist|hlist|flatlist)\s*\|([^{}]*)\}\}/gi, (_, items: string) =>
      items
        .split("|")
        .map((s) => s.trim())
        .filter(Boolean)
        .join("; ")
    );
    out = out.replace(/\{\{[^{}]*\}\}/g, "");
  }
  return out;
}

export function cleanWikitext(value: string): string {
  return stripTemplates(
    value
      .replace(/<ref[^>]*\/>/gi, "")
      .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, "")
      .replace(/<!--[\s\S]*?-->/g, "")
  )
    .replace(/<br\s*\/?>/gi, "; ")
    .replace(/<[^>]+>/g, "")
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, "$1")
    .replace(/\[https?:\/\/\S+\s([^\]]+)\]/g, "$1")
    .replace(/'{2,}/g, "")
    .replace(/^\s*\*\s*/gm, "")
    .replace(/\s*\n\s*/g, "; ")
    .replace(/\s+/g, " ")
    .replace(/\.\s*;/g, ";")
    .replace(/(;\s*)+/g, "; ")
    .replace(/^[;\s]+|[;\s]+$/g, "")
    .trim();
}

// Infobox field → card label, in the order cards show them.
const FACT_FIELDS: [string[], string][] = [
  [["origin"], "Origin"],
  [["insertion"], "Insertion"],
  [["action", "actions"], "Action"],
  [["nerve", "innervation"], "Innervation"],
  [["blood", "artery"], "Arterial supply"],
  [["vein"], "Venous drainage"],
  [["lymph"], "Lymphatic drainage"],
  [["supplies"], "Supplies"],
  [["source"], "Source"],
  [["branches", "branchesto", "branchto"], "Branches"],
  [["drainsfrom"], "Drains from"],
  [["drainsto"], "Drains to"],
  [["from", "branchfrom"], "Arises from"],
  [["innervates"], "Innervates"],
  [["articulations"], "Articulations"],
  [["antagonist"], "Antagonist"],
];

// The {{Infobox ...}} template's parameters, split at its own top level.
function infoboxParams(wikitext: string): Map<string, string> {
  const start = wikitext.search(/\{\{\s*Infobox/i);
  const params = new Map<string, string>();
  if (start < 0) return params;
  let depth = 0;
  let current = "";
  const parts: string[] = [];
  for (let i = start; i < wikitext.length; i++) {
    const two = wikitext.slice(i, i + 2);
    if (two === "{{" || two === "[[") {
      depth++;
      current += two;
      i++;
    } else if (two === "}}" || two === "]]") {
      depth--;
      if (depth === 0) {
        parts.push(current);
        break;
      }
      current += two;
      i++;
    } else if (wikitext[i] === "|" && depth === 1) {
      parts.push(current);
      current = "";
    } else {
      current += wikitext[i];
    }
  }
  for (const part of parts.slice(1)) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const key = part.slice(0, eq).trim().toLowerCase().replace(/[\s_]/g, "");
    params.set(key, part.slice(eq + 1));
  }
  return params;
}

const SPINAL_LEVEL = /^[CTLS]\d+$/;

export function parseInfobox(wikitext: string): Fact[] {
  const params = infoboxParams(wikitext);
  const clean = (key: string) => cleanWikitext(params.get(key) ?? "");
  // Nerve infoboxes sometimes put spinal root levels in BranchFrom/BranchTo
  // (femoral nerve: L2, L4); that reads as one range, not two facts.
  const from = clean("branchfrom");
  const to = clean("branchto");
  const roots = SPINAL_LEVEL.test(from) && SPINAL_LEVEL.test(to) ? `${from}–${to}` : null;
  if (roots) {
    params.delete("branchfrom");
    params.delete("branchto");
  }

  const facts: Fact[] = [];
  for (const [keys, label] of FACT_FIELDS) {
    const raw = keys.map((k) => params.get(k)).find((v) => v && v.trim());
    const value = raw ? cleanWikitext(raw) : "";
    if (value) facts.push({ label, value });
    if (label === "Innervates" && roots) facts.push({ label: "Roots", value: roots });
  }
  return facts;
}

const namesWithFacts = new WeakMap<Record<string, Fact[]>, string[]>();

// A structure's quick facts: its own article's, or else those of the whole
// structure its name contains ("Acromial part of deltoid muscle" → "Deltoid
// muscle").
export function factsFor(
  structureName: string,
  facts: Record<string, Fact[]>
): { from: string; exact: boolean; facts: Fact[] } | null {
  let names = namesWithFacts.get(facts);
  if (!names) {
    names = Object.keys(facts).filter((k) => facts[k].length > 0);
    namesWithFacts.set(facts, names);
  }
  const match = matchDescription(structureName, names);
  return match ? { from: match.name, exact: match.exact, facts: facts[match.name] } : null;
}

export function buildContent(input: {
  id: string;
  name: string;
  text: string;
  match: { name: string; exact: boolean };
  facts: Fact[];
  factsFrom?: string | null;
}): StructureContent {
  const d = parseDescription(input.text);
  const sourceTitle = d.title || input.match.name.replace(/[()]/g, "").trim();
  return {
    id: input.id,
    sourceTitle,
    exact: input.match.exact,
    summary: d.summary,
    facts: input.facts,
    factsFrom: input.factsFrom ?? null,
    sections: d.sections,
    reviewed: false,
    credit: {
      text: "Text adapted from Wikipedia via Z-Anatomy",
      licence: "CC BY-SA 4.0",
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(sourceTitle.replace(/ /g, "_"))}`,
    },
  };
}
