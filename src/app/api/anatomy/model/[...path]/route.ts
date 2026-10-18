import { auth } from "@/auth";
import { canLoadModelKey } from "@/lib/anatomy/access";
import { modelResponseFor, structureSystems, validModelPath } from "@/lib/anatomy/model-storage";
import { isAnatomyOpenTo } from "@/lib/anatomy/preview-access";
import { accessForUser } from "@/lib/anatomy/subscriptions";

const notFound = () => new Response("Not found", { status: 404 });

// The Body Explorer's 3D model files and study cards. /api is outside the
// proxy, so this checks the session itself, then the user's plan: no plan
// (or an ended one) gets nothing, a skeleton-only trial gets only skeletal
// files. Refusals look the same as a missing file.
export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const session = await auth();
  if (!session?.user?.id || !isAnatomyOpenTo(session.user.email)) return notFound();

  const key = validModelPath((await params).path);
  if (!key) return notFound();

  const access = await accessForUser(session.user.id, session.user.role);
  let systems: Map<string, string> | null = null;
  if (access.level === "skeletal" && key.includes("/content/")) systems = await structureSystems(key.split("/")[0]);
  if (!canLoadModelKey(access.level, key, (id) => systems?.get(id))) return notFound();

  return modelResponseFor(key);
}
