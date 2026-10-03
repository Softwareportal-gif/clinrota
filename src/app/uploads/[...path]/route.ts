import path from "path";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { readUploadedFile, UPLOAD_CONTENT_TYPES, UPLOAD_SUBDIRS, type UploadSubdir } from "@/lib/upload";

// Matches exactly what saveUploadedFile generates — anything else (including
// "..", encoded separators, or extra segments) never reaches storage.
const FILENAME_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|jpe?g|png)$/;

export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const segments = (await params).path;
  if (segments.length !== 2) return new Response("Not found", { status: 404 });
  const [subdir, filename] = segments;
  if (!(UPLOAD_SUBDIRS as readonly string[]).includes(subdir) || !FILENAME_PATTERN.test(filename)) {
    return new Response("Not found", { status: 404 });
  }

  // Compliance files are personal records (immunizations, background checks)
  // — a student may only open their own.
  if (session.user.role === "STUDENT") {
    if (subdir !== "compliance") return new Response("Not found", { status: 404 });
    const owned = await prisma.complianceDocument.findFirst({
      where: { fileUrl: `/uploads/${subdir}/${filename}`, student: { userId: session.user.id } },
      select: { id: true },
    });
    if (!owned) return new Response("Not found", { status: 404 });
  }

  const body = await readUploadedFile(subdir as UploadSubdir, filename);
  if (!body) return new Response("Not found", { status: 404 });

  return new Response(body, {
    headers: {
      "Content-Type": UPLOAD_CONTENT_TYPES[path.extname(filename)] ?? "application/octet-stream",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
