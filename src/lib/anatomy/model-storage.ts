// Where the Body Explorer's model files live and how a request for one is
// answered. Paths are versioned ("v3/chunks/skeletal/thorax/low.glb"), so a
// file never changes once published and can be cached for a year.
//
// Deployed, the files sit in a private Cloudflare R2 bucket under models/
// (or, without R2, the site's Vercel Blob store under anatomy/models/) and
// the route answers with a short-lived signed link, so large files never pass
// through a function. R2 is preferred: the Hobby plan's Blob operation limit
// is far below what one upload of the atlas needs. Locally, without either,
// they're read from the build output, ANATOMY_BUILD_DIR (default
// ./anatomy-build), uncached.
import { readFile } from "fs/promises";
import path from "path";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { get, issueSignedToken, presignUrl, type IssuedSignedToken } from "@vercel/blob";
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
  // Study cards: content/<structure id>.json
  if (rest.length === 2 && rest[0] === "content" && /^[a-z0-9][a-z0-9-]*\.json$/.test(rest[1])) {
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

// The project's Blob store connects via OIDC + store ID (custom-prefixed
// name, see src/lib/upload.ts) or a read-write token.
export function blobStoreId(): string | undefined {
  return process.env.BLOB_STORE_ID ?? process.env.BLOB_READ_WRITE_TOKEN_STORE_ID;
}

export function blobEnabled(): boolean {
  return !!(process.env.BLOB_READ_WRITE_TOKEN || blobStoreId());
}

export const BLOB_PREFIX = "anatomy/models";

// Where the model files are read from: R2 when configured (it wins over the
// Blob store, which the main app also uses for uploads), else the Blob
// store, else the local build.
export function modelStorage(): "r2" | "blob" | "local" {
  if (r2Config()) return "r2";
  if (blobEnabled()) return "blob";
  return "local";
}

// One store-wide read token, kept server-side and reused until near expiry;
// each request then gets its own URL, signed for just that file.
let readToken: IssuedSignedToken | null = null;

async function signedBlobUrl(key: string): Promise<string> {
  const now = Date.now();
  if (!readToken || readToken.validUntil - now < 15 * 60_000) {
    readToken = await issueSignedToken({ operations: ["get"], validUntil: now + 60 * 60_000, storeId: blobStoreId() });
  }
  const { presignedUrl } = await presignUrl(readToken, {
    operation: "get",
    pathname: `${BLOB_PREFIX}/${key}`,
    access: "private",
    validUntil: Math.min(now + SIGNED_URL_SECONDS * 1000, readToken.validUntil),
  });
  return presignedUrl;
}

// Structure id → system, from the catalogue, for checks that depend on a
// structure's system (skeleton-only access). Cached per version.
const systemsCache = new Map<string, Map<string, string>>();

export async function structureSystems(version: string): Promise<Map<string, string>> {
  const cached = systemsCache.get(version);
  if (cached) return cached;
  const key = `${version}/catalogue.json`;
  let text: string;
  const storage = modelStorage();
  if (storage === "r2") {
    const r2 = r2Config()!;
    const result = await r2.client.send(new GetObjectCommand({ Bucket: r2.bucket, Key: `models/${key}` }));
    if (!result.Body) throw new Error("catalogue not found");
    text = await result.Body.transformToString();
  } else if (storage === "blob") {
    const result = await get(`${BLOB_PREFIX}/${key}`, { access: "private", storeId: blobStoreId() });
    if (!result || !result.stream) throw new Error("catalogue not found");
    text = await new Response(result.stream).text();
  } else {
    text = await readFile(path.join(path.resolve(process.env.ANATOMY_BUILD_DIR || "anatomy-build", "models"), version, "catalogue.json"), "utf8");
  }
  const catalogue = JSON.parse(text) as { structures: { id: string; system: string }[] };
  const map = new Map(catalogue.structures.map((s) => [s.id, s.system]));
  systemsCache.set(version, map);
  return map;
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
  const storage = modelStorage();
  if (storage === "r2") {
    const r2 = r2Config()!;
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

  if (storage === "blob") {
    const url = await signedBlobUrl(key);
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
