// Where the Body Explorer's model files live and how a request for one is
// answered. Paths are versioned ("v3/chunks/skeletal/thorax/low.glb"), so a
// file never changes once published and can be cached for a year.
//
// With R2 configured (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
// R2_BUCKET) the route answers with a short-lived signed link to the private
// bucket. Without it (local development) the file is read from the build
// output, ANATOMY_BUILD_DIR (default ./anatomy-build), uncached.
import { readFile } from "fs/promises";
import path from "path";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { LODS, SYSTEMS } from "./catalogue";

export const SIGNED_URL_SECONDS = 600;
export const IMMUTABLE_CACHE = "private, max-age=31536000, immutable";
// The local build is rebuilt in place while developing, so always revalidate.
const LOCAL_CACHE = "private, no-cache";

const VERSION = /^v\d+$/;
const SLUG = /^[a-z0-9-]+$/;

// The storage key for a request's path segments, or null for anything the
// build could not have produced (so "..", encoded slashes and unknown files
// never reach storage).
export function validModelPath(segments: string[]): string | null {
  const [version, ...rest] = segments;
  if (!version || !VERSION.test(version)) return null;
  if (rest.length === 1 && (rest[0] === "catalogue.json" || rest[0] === "overview.glb")) {
    return [version, ...rest].join("/");
  }
  if (rest.length === 4 && rest[0] === "chunks") {
    const [, system, region, file] = rest;
    const lod = file.endsWith(".glb") ? file.slice(0, -".glb".length) : "";
    if ((SYSTEMS as readonly string[]).includes(system) && SLUG.test(region) && (LODS as readonly string[]).includes(lod)) {
      return [version, ...rest].join("/");
    }
  }
  return null;
}

export function contentTypeFor(key: string) {
  return key.endsWith(".json") ? "application/json" : "model/gltf-binary";
}

export function r2Config() {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) return null;
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  });
  return { client, bucket: R2_BUCKET };
}

// `key` must come from validModelPath.
export async function modelResponseFor(key: string): Promise<Response> {
  const r2 = r2Config();
  if (r2) {
    const url = await getSignedUrl(
      r2.client,
      new GetObjectCommand({
        Bucket: r2.bucket,
        Key: `models/${key}`,
        ResponseContentType: contentTypeFor(key),
        ResponseCacheControl: IMMUTABLE_CACHE,
      }),
      { expiresIn: SIGNED_URL_SECONDS }
    );
    // Reusing the redirect for a few minutes keeps the signed URL stable, so
    // the browser's cached copy of the file is reused too.
    return new Response(null, { status: 302, headers: { Location: url, "Cache-Control": "private, max-age=300" } });
  }

  const root = path.resolve(process.env.ANATOMY_BUILD_DIR || "anatomy-build", "models");
  try {
    const body = await readFile(path.join(root, ...key.split("/")));
    return new Response(new Uint8Array(body), {
      headers: {
        "Content-Type": contentTypeFor(key),
        "Cache-Control": LOCAL_CACHE,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
