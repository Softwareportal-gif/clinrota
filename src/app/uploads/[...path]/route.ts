import path from "path";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { readUploadedFile, UPLOAD_CONTENT_TYPES, UPLOAD_SUBDIRS, type UploadSubdir } from "@/lib/upload";

// Matches exactly what saveUploadedFile generates — anything else (including
// "..", encoded separators, or extra segments) never reaches storage.
const FILENAME_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|jpe?g|png)$/;

// One plain page for a file that is missing, not yours, or never existed (demo
// data): the same answer every time, so it never reveals which files exist.
function notAvailable(): Response {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>File not available · Praxxt</title></head>
<body style="margin:0;font-family:system-ui,sans-serif;background:#F7F6FC;color:#17153B;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px">
<div style="max-width:420px;background:#fff;border:1px solid #ECEBF5;border-radius:16px;padding:28px;text-align:center">
<h1 style="font-size:20px;margin:0 0 8px">This file isn't available</h1>
<p style="margin:0 0 20px;color:#4A4867;line-height:1.5">It may have been removed or replaced, or it was never uploaded. Ask for it to be uploaded again if you need it.</p>
<a href="javascript:history.back()" style="display:inline-block;background:#5A3BF0;color:#fff;text-decoration:none;padding:10px 18px;border-radius:999px;font-weight:600">Go back</a>
</div></body></html>`;
  return new Response(html, { status: 404, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}

export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const segments = (await params).path;
  if (segments.length !== 2) return notAvailable();
  const [subdir, filename] = segments;
  if (!(UPLOAD_SUBDIRS as readonly string[]).includes(subdir) || !FILENAME_PATTERN.test(filename)) {
    return notAvailable();
  }

  // Compliance files are personal records (immunizations, background
  // checks): a student may open only their own, and a coordinator only those
  // of students in their program. Site agreements (MOUs) are for
  // coordinators of the site's institution. No other role views uploads.
  const fileUrl = `/uploads/${subdir}/${filename}`;
  let allowed = false;
  if (session.user.role === "STUDENT" && subdir === "compliance") {
    allowed = !!(await prisma.complianceDocument.findFirst({
      where: { fileUrl, student: { userId: session.user.id } },
      select: { id: true },
    }));
  } else if (session.user.role === "COORDINATOR") {
    const coordinator = await prisma.coordinatorProfile.findUnique({
      where: { userId: session.user.id },
      include: { program: { select: { institutionId: true } } },
    });
    if (coordinator && subdir === "compliance") {
      allowed = !!(await prisma.complianceDocument.findFirst({
        where: { fileUrl, student: { programId: coordinator.programId } },
        select: { id: true },
      }));
    } else if (coordinator && subdir === "site-mou") {
      allowed = !!(await prisma.clinicalSite.findFirst({
        where: { mouDocumentUrl: fileUrl, institutionId: coordinator.program.institutionId },
        select: { id: true },
      }));
    }
  }
  if (!allowed) return notAvailable();

  const body = await readUploadedFile(subdir as UploadSubdir, filename);
  if (!body) return notAvailable();

  return new Response(body, {
    headers: {
      "Content-Type": UPLOAD_CONTENT_TYPES[path.extname(filename)] ?? "application/octet-stream",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
