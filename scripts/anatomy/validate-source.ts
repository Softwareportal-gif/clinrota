// Usage: npm run anatomy:validate -- <sourceDir>
// Checks an anatomy-source/ folder (structures.csv + meshes/) and lists
// every problem; exits 1 if there are any.
import { readFileSync, readdirSync } from "fs";
import path from "path";
import { parseStructuresCsv, validateSource } from "../../src/lib/anatomy/source-format";

const dir = process.argv[2];
if (!dir) {
  console.error("Usage: npm run anatomy:validate -- <sourceDir>");
  process.exit(2);
}

const rows = parseStructuresCsv(readFileSync(path.join(dir, "structures.csv"), "utf8"));
const meshIds = readdirSync(path.join(dir, "meshes"))
  .filter((f) => f.endsWith(".glb"))
  .map((f) => f.slice(0, -".glb".length));

const errors = validateSource(rows, meshIds);
for (const e of errors) console.error(e);
console.log(`${rows.length} structures, ${meshIds.length} meshes, ${errors.length} errors`);
process.exit(errors.length ? 1 : 0);
