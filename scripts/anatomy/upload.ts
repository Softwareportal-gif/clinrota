// Usage: npm run anatomy:upload -- --version v1 [--out anatomy-build]
// Uploads anatomy-build/models/<version>/** to the private R2 bucket under
// models/<version>/, with the content types the model route expects. Needs
// R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET.
import { readFileSync, readdirSync } from "fs";
import path from "path";
import { parseArgs } from "util";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { contentTypeFor, IMMUTABLE_CACHE, r2Config } from "../../src/lib/anatomy/model-storage";

async function main() {
  const { values } = parseArgs({ options: { version: { type: "string" }, out: { type: "string" } } });
  if (!values.version || !/^v\d+$/.test(values.version)) {
    console.error("Usage: npm run anatomy:upload -- --version v1 [--out anatomy-build]");
    process.exit(2);
  }
  const r2 = r2Config();
  if (!r2) {
    console.error("Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET first.");
    process.exit(2);
  }

  const root = path.join(values.out ?? "anatomy-build", "models", values.version);
  const files = readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(entry.parentPath, entry.name));

  let bytes = 0;
  for (const file of files) {
    const key = `models/${values.version}/${path.relative(root, file).split(path.sep).join("/")}`;
    const body = readFileSync(file);
    await r2.client.send(
      new PutObjectCommand({
        Bucket: r2.bucket,
        Key: key,
        Body: body,
        ContentType: contentTypeFor(key),
        CacheControl: IMMUTABLE_CACHE,
      })
    );
    bytes += body.byteLength;
    console.log(`uploaded ${key}`);
  }
  console.log(`${files.length} files, ${(bytes / 1024 / 1024).toFixed(1)} MB`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
