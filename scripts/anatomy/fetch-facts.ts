// Usage: npm run anatomy:facts -- --source anatomy-source
// One-off import of quick facts (origin, insertion, action, innervation,
// blood supply...) from the Wikipedia article matching each structure's
// description. Saves <source>/facts.json ({ descriptionName: Fact[] }) so
// builds stay offline and repeatable. Re-run only to refresh.
import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { parseArgs } from "util";
import { matchDescription, parseInfobox, type Fact } from "../../src/lib/anatomy/content";
import { parseStructuresCsv } from "../../src/lib/anatomy/source-format";

const API = "https://en.wikipedia.org/w/api.php";
const BATCH = 50;
const PAUSE_MS = 1000;
const HEADERS = { "User-Agent": "PraxxtAnatomyBuild/1.0 (https://praxxt.com)" };

type ApiResponse = {
  query?: {
    normalized?: { from: string; to: string }[];
    redirects?: { from: string; to: string }[];
    pages?: { title: string; missing?: boolean; revisions?: { slots: { main: { content: string } } }[] }[];
  };
};

const titleFor = (descriptionName: string) => descriptionName.replace(/[()]/g, "").replace(/\s+/g, " ").trim();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const { values } = parseArgs({ options: { source: { type: "string" } } });
  const dir = values.source ?? "anatomy-source";
  const rows = parseStructuresCsv(readFileSync(path.join(dir, "structures.csv"), "utf8"));
  const names = Object.keys(JSON.parse(readFileSync(path.join(dir, "texts.json"), "utf8")));

  // Every description, not just the ones structures match directly: a part
  // ("Acromial part of deltoid muscle") borrows the whole muscle's facts,
  // and no structure is named just "Deltoid muscle".
  const descriptionNames = names;
  const direct = new Set(rows.map((row) => matchDescription(row.name, names)?.name).filter(Boolean));
  console.log(`${rows.length} structures, ${direct.size} matched directly; checking all ${names.length} articles`);

  const facts: Record<string, Fact[]> = {};
  for (let i = 0; i < descriptionNames.length; i += BATCH) {
    const batch = descriptionNames.slice(i, i + BATCH);
    const params = new URLSearchParams({
      action: "query",
      prop: "revisions",
      rvprop: "content",
      rvslots: "main",
      redirects: "1",
      format: "json",
      formatversion: "2",
      titles: batch.map(titleFor).join("|"),
    });
    const res = await fetch(`${API}?${params}`, { headers: HEADERS });
    if (!res.ok) throw new Error(`Wikipedia API ${res.status}`);
    const data = (await res.json()) as ApiResponse;

    // Follow normalisation and redirects back to the title we asked for.
    const resolve = new Map<string, string>();
    for (const n of data.query?.normalized ?? []) resolve.set(n.from, n.to);
    for (const r of data.query?.redirects ?? []) resolve.set(r.from, r.to);
    const final = (t: string) => {
      let title = t;
      for (let hops = 0; hops < 3 && resolve.has(title); hops++) title = resolve.get(title)!;
      return title;
    };
    const content = new Map<string, string>();
    for (const page of data.query?.pages ?? []) {
      const text = page.revisions?.[0]?.slots.main.content;
      if (text) content.set(page.title, text);
    }
    for (const name of batch) {
      const text = content.get(final(titleFor(name)));
      const parsed = text ? parseInfobox(text) : [];
      if (parsed.length) facts[name] = parsed;
    }
    process.stdout.write(`\r${Math.min(i + BATCH, descriptionNames.length)}/${descriptionNames.length} checked, ${Object.keys(facts).length} with facts`);
    await sleep(PAUSE_MS);
  }

  writeFileSync(path.join(dir, "facts.json"), JSON.stringify(facts, null, 1));
  console.log(`\nSaved quick facts for ${Object.keys(facts).length} articles to ${path.join(dir, "facts.json")}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
