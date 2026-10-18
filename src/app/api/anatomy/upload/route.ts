import { timingSafeEqual } from "crypto";
import { issueSignedToken } from "@vercel/blob";
import { handleUploadPresigned, type HandleUploadPresignedBody } from "@vercel/blob/client";
import { blobStoreId } from "@/lib/anatomy/model-storage";

// Lets the anatomy upload script (scripts/anatomy/upload-blob.ts --via) put
// model files into the private Blob store through the deployed site, which
// holds the store's credentials. Only callers with ANATOMY_UPLOAD_SECRET get
// an upload link, and only under anatomy/models/; without the secret set the
// route doesn't exist.
const PATHNAME = /^anatomy\/models\/v\d+\/[a-z0-9][a-z0-9/._-]*\.(glb|json)$/;

function secretMatches(given: string | null): boolean {
  const secret = process.env.ANATOMY_UPLOAD_SECRET;
  if (!secret || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!secretMatches(request.headers.get("x-anatomy-upload-secret"))) return new Response("Not found", { status: 404 });

  const body = (await request.json()) as HandleUploadPresignedBody;
  try {
    const result = await handleUploadPresigned({
      body,
      request,
      getSignedToken: async (pathname) => {
        if (!PATHNAME.test(pathname) || pathname.includes("..")) throw new Error("Not an anatomy model path");
        const token = await issueSignedToken({
          pathname,
          operations: ["put"],
          validUntil: Date.now() + 10 * 60_000,
          storeId: blobStoreId(),
        });
        return {
          token,
          urlOptions: { allowedContentTypes: ["model/gltf-binary", "application/json"], maximumSizeInBytes: 25 * 1024 * 1024 },
        };
      },
    });
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Upload refused" }, { status: 400 });
  }
}
