import { writeFile, mkdir, readFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { put, get } from "@vercel/blob";

// Vercel rejects function request bodies over ~4.5MB, so the file itself
// has to stay under that with room for the rest of the multipart form.
export const MAX_UPLOAD_MB = 4;
const MAX_SIZE_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

export const UPLOAD_CONTENT_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
};

export const UPLOAD_SUBDIRS = ["compliance", "site-mou"] as const;
export type UploadSubdir = (typeof UPLOAD_SUBDIRS)[number];

// Vercel's filesystem is read-only, so deployed uploads go to a *private*
// Blob store (unreadable except through the authenticated /uploads route).
// Without a Blob token — local dev — they go to ./uploads, outside public/.
// Newer Blob stores authenticate via Vercel OIDC plus a store ID instead of a
// read-write token. The SDK only auto-reads BLOB_STORE_ID; this project's
// store was connected with a custom prefix, hence the second name.
function blobStoreId(): string | undefined {
  return process.env.BLOB_STORE_ID ?? process.env.BLOB_READ_WRITE_TOKEN_STORE_ID;
}

function blobStorageEnabled(): boolean {
  return !!(process.env.BLOB_READ_WRITE_TOKEN || blobStoreId());
}

function localUploadRoot(): string {
  return process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");
}

// Server-generated filename (never the client-supplied name), so there's no
// path-traversal or overwrite risk.
export async function saveUploadedFile(
  file: File,
  subdir: UploadSubdir
): Promise<{ url: string } | { error: string }> {
  if (!file || file.size === 0) {
    return { error: "Choose a file to upload." };
  }
  if (file.size > MAX_SIZE_BYTES) {
    return { error: `File is too large (max ${MAX_UPLOAD_MB}MB).` };
  }
  const ext = path.extname(file.name).toLowerCase();
  if (!(ext in UPLOAD_CONTENT_TYPES)) {
    return { error: "Only PDF, JPG, or PNG files are allowed." };
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const pathname = `uploads/${subdir}/${randomUUID()}${ext}`;

  if (blobStorageEnabled()) {
    await put(pathname, bytes, {
      access: "private",
      contentType: UPLOAD_CONTENT_TYPES[ext],
      storeId: blobStoreId(),
    });
  } else {
    const fullPath = path.join(localUploadRoot(), pathname.slice("uploads/".length));
    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, bytes);
  }

  return { url: `/${pathname}` };
}

// Callers must validate subdir/filename first — see the /uploads route.
export async function readUploadedFile(
  subdir: UploadSubdir,
  filename: string
): Promise<ReadableStream<Uint8Array> | Uint8Array<ArrayBuffer> | null> {
  if (blobStorageEnabled()) {
    const result = await get(`uploads/${subdir}/${filename}`, { access: "private", storeId: blobStoreId() });
    return result?.statusCode === 200 ? result.stream : null;
  }
  try {
    return new Uint8Array(await readFile(path.join(localUploadRoot(), subdir, filename)));
  } catch {
    return null;
  }
}
