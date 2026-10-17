// Usage: npm run anatomy:build -- --source anatomy-source --out anatomy-build --version v1
// Builds the Body Explorer's model chunks, overview and catalogue from a
// validated anatomy-source/ folder, then reports the sizes that matter for
// phones: the overview (must stay at or under 5 MB) and the largest chunk at
// each detail level.
import { parseArgs } from "util";
import { LODS } from "../../src/lib/anatomy/catalogue";
import { buildAnatomy } from "../../src/lib/anatomy/pipeline";

const OVERVIEW_LIMIT = 5 * 1024 * 1024;
const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;

async function main() {
  const { values } = parseArgs({
    options: { source: { type: "string" }, out: { type: "string" }, version: { type: "string" } },
  });
  if (!values.source || !values.out || !values.version || !/^v\d+$/.test(values.version)) {
    console.error("Usage: npm run anatomy:build -- --source <dir> --out <dir> --version <v1>");
    process.exit(2);
  }

  const catalogue = await buildAnatomy({ sourceDir: values.source, outDir: values.out, version: values.version });
  console.log(`${catalogue.structures.length} structures in ${catalogue.chunks.length} chunks`);
  console.log(`overview: ${mb(catalogue.overviewBytes)}${catalogue.overviewBytes > OVERVIEW_LIMIT ? "  OVER 5 MB" : ""}`);
  for (const lod of LODS) {
    const largest = catalogue.chunks.reduce((a, b) => (b.bytes[lod] > a.bytes[lod] ? b : a));
    console.log(`largest ${lod}: ${largest.id} ${mb(largest.bytes[lod])}`);
  }
  if (catalogue.overviewBytes > OVERVIEW_LIMIT) process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
