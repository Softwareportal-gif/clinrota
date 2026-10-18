// Usage: npm run anatomy:upload-blob -- --version v1 [--store-id store_…] [--project <linked dir>] [--out anatomy-build]
// Uploads anatomy-build/models/<version>/** to the site's private Vercel Blob
// store under anatomy/models/<version>/, where the model route serves them
// through short-lived signed links.
//
// Credentials: uses your Vercel CLI login. It pulls the project's short-lived
// development token (`vercel env pull`) into a temporary file, reads it, and
// deletes the file straight away; nothing is printed or kept.
//
// Or upload through the deployed site (when the store isn't connected to the
// development environment): --via https://praxxt.com --secret-file <file
// holding ANATOMY_UPLOAD_SECRET>; see src/app/api/anatomy/upload/route.ts.
import { execFileSync } from "child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "fs";
import os from "os";
import path from "path";
import { parseArgs } from "util";
import { put } from "@vercel/blob";
import { uploadPresigned } from "@vercel/blob/client";

const CONCURRENCY = 12;

function loadVercelCredentials(projectDir: string, storeIdOption?: string): { storeId: string } {
  const dir = mkdtempSync(path.join(os.tmpdir(), "praxxt-blob-"));
  const file = path.join(dir, "vercel.env");
  try {
    execFileSync("vercel", ["env", "pull", file, "--environment=development", "--yes", "--non-interactive"], {
      cwd: projectDir,
      stdio: "ignore",
      shell: true,
    });
    process.loadEnvFile(file);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  // The store ID isn't secret (vercel blob list-stores shows it); development
  // settings may not carry it, so it can be passed with --store-id.
  const storeId = storeIdOption ?? process.env.BLOB_STORE_ID ?? process.env.BLOB_READ_WRITE_TOKEN_STORE_ID;
  if (!process.env.VERCEL_OIDC_TOKEN || !storeId) {
    throw new Error("Couldn't get Blob credentials from Vercel. Run `vercel login` and `vercel link` in the project first.");
  }
  return { storeId };
}

const contentTypeFor = (file: string) => (file.endsWith(".json") ? "application/json" : "model/gltf-binary");

async function main() {
  const { values } = parseArgs({ options: {
      version: { type: "string" },
      out: { type: "string" },
      project: { type: "string" },
      "store-id": { type: "string" },
      via: { type: "string" },
      "secret-file": { type: "string" },
    } });
  if (!values.version || !/^v\d+$/.test(values.version)) {
    console.error("Usage: npm run anatomy:upload-blob -- --version v1 [--out anatomy-build] [--project <linked project dir>]");
    process.exit(2);
  }
  const via = values.via?.replace(/\/$/, "");
  const secret = values["secret-file"] ? readFileSync(values["secret-file"], "utf8").trim() : "";
  if (via && !secret) {
    console.error("--via needs --secret-file with the site's ANATOMY_UPLOAD_SECRET");
    process.exit(2);
  }
  const storeId = via ? "" : loadVercelCredentials(values.project ?? process.cwd(), values["store-id"]).storeId;

  const root = path.join(values.out ?? "anatomy-build", "models", values.version);
  const files = readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => path.join(e.parentPath, e.name));

  let done = 0;
  let bytes = 0;
  const queue = [...files];
  async function worker() {
    for (let file = queue.shift(); file; file = queue.shift()) {
      const key = `anatomy/models/${values.version}/${path.relative(root, file).split(path.sep).join("/")}`;
      const body = readFileSync(file);
      for (let attempt = 1; ; attempt++) {
        try {
          if (via) {
            await uploadPresigned(key, body, {
              access: "private",
              handleUploadUrl: `${via}/api/anatomy/upload`,
              headers: { "x-anatomy-upload-secret": secret },
              contentType: contentTypeFor(file),
            });
            break;
          }
          await put(key, body, {
            access: "private",
            storeId,
            contentType: contentTypeFor(file),
            allowOverwrite: true,
            addRandomSuffix: false,
            cacheControlMaxAge: 31536000,
            multipart: body.byteLength > 8 * 1024 * 1024,
          });
          break;
        } catch (error) {
          if (attempt >= 3) throw error;
          await new Promise((r) => setTimeout(r, 1000 * attempt));
        }
      }
      done++;
      bytes += body.byteLength;
      if (done % 100 === 0 || done === files.length) {
        process.stdout.write(`\r${done}/${files.length} files, ${(bytes / 1048576).toFixed(1)} MB`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log(`\nUploaded ${files.length} files to anatomy/models/${values.version}/`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
