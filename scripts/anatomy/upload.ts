// Usage: npm run anatomy:upload -- --version v1 [--env-file <file>] [--out anatomy-build]
// Uploads anatomy-build/models/<version>/** to the private R2 bucket under
// models/<version>/, with the content types the model route expects, and
// lets browsers read the bucket's signed links (CORS). Needs R2_ACCOUNT_ID,
// R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET, from the environment
// or from --env-file (a local, git-ignored file; nothing from it is printed).
import { readFileSync, readdirSync } from "fs";
import path from "path";
import { parseArgs } from "util";
import { PutBucketCorsCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { contentTypeFor, IMMUTABLE_CACHE, r2Config } from "../../src/lib/anatomy/model-storage";

const CONCURRENCY = 12;

// The model route redirects to a signed link on R2, so the browser's fetch
// arrives cross-origin (with Origin "null" after the redirect). The links
// themselves are the access control, so any origin may read them.
const CORS_RULES = [{ AllowedOrigins: ["*"], AllowedMethods: ["GET", "HEAD"], AllowedHeaders: ["*"], MaxAgeSeconds: 86400 }];

async function main() {
  const { values } = parseArgs({
    options: { version: { type: "string" }, out: { type: "string" }, "env-file": { type: "string" } },
  });
  if (!values.version || !/^v\d+$/.test(values.version)) {
    console.error("Usage: npm run anatomy:upload -- --version v1 [--env-file <file>] [--out anatomy-build]");
    process.exit(2);
  }
  if (values["env-file"]) process.loadEnvFile(values["env-file"]);
  const r2 = r2Config();
  if (!r2) {
    console.error("Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET first.");
    process.exit(2);
  }

  try {
    await r2.client.send(new PutBucketCorsCommand({ Bucket: r2.bucket, CORSConfiguration: { CORSRules: CORS_RULES } }));
    console.log("Bucket CORS set.");
  } catch (err) {
    console.warn(`Couldn't set the bucket's CORS policy (${err instanceof Error ? err.name : "error"}); set it in the Cloudflare dashboard.`);
  }

  const root = path.join(values.out ?? "anatomy-build", "models", values.version);
  const files = readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(entry.parentPath, entry.name));

  let done = 0;
  let bytes = 0;
  const queue = [...files];
  async function worker() {
    for (let file = queue.shift(); file; file = queue.shift()) {
      const key = `models/${values.version}/${path.relative(root, file).split(path.sep).join("/")}`;
      const body = readFileSync(file);
      for (let attempt = 1; ; attempt++) {
        try {
          await r2!.client.send(
            new PutObjectCommand({ Bucket: r2!.bucket, Key: key, Body: body, ContentType: contentTypeFor(key), CacheControl: IMMUTABLE_CACHE })
          );
          break;
        } catch (err) {
          if (attempt >= 3) throw err;
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
  console.log(`\nUploaded ${files.length} files to ${r2.bucket}/models/${values.version}/`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
