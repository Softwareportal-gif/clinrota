import { auth } from "@/auth";
import { isAnatomyPreviewEnabled } from "@/lib/anatomy/preview-access";
import { modelResponseFor, validModelPath } from "@/lib/anatomy/model-storage";

// The Body Explorer's 3D model files. /api is outside the proxy, so this
// checks the session itself; while the explorer is unpublished, anyone not
// on the preview list gets the same 404 as a missing file.
export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const session = await auth();
  if (!session?.user || !isAnatomyPreviewEnabled(session.user.email)) {
    return new Response("Not found", { status: 404 });
  }

  const key = validModelPath((await params).path);
  if (!key) return new Response("Not found", { status: 404 });

  return modelResponseFor(key);
}
