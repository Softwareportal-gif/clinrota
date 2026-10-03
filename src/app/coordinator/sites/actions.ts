"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";
import { getCoordinatorProfileByUserId } from "@/lib/coordinator";
import { saveUploadedFile } from "@/lib/upload";

export type SiteFormState = { error?: string } | undefined;

const schema = z.object({
  name: z.string().trim().min(2, "Enter a site name."),
  location: z.string().trim().optional(),
  contactName: z.string().trim().optional(),
  contactPhone: z.string().trim().optional(),
  contactEmail: z.string().trim().email("Enter a valid email.").optional().or(z.literal("")),
  mouStartDate: z.string().optional(),
  mouEndDate: z.string().optional(),
  maxStudentCapacity: z.coerce.number().int().min(0).optional(),
});

function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function createSite(
  _prevState: SiteFormState,
  formData: FormData
): Promise<SiteFormState> {
  const session = await requireRole("COORDINATOR");
  const coordinatorProfile = await getCoordinatorProfileByUserId(session.user.id);

  const parsed = schema.safeParse({
    name: formData.get("name"),
    location: formData.get("location") || undefined,
    contactName: formData.get("contactName") || undefined,
    contactPhone: formData.get("contactPhone") || undefined,
    contactEmail: formData.get("contactEmail") || "",
    mouStartDate: formData.get("mouStartDate") || undefined,
    mouEndDate: formData.get("mouEndDate") || undefined,
    maxStudentCapacity: formData.get("maxStudentCapacity") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  let mouDocumentUrl: string | undefined;
  const file = formData.get("mouDocument");
  if (file instanceof File && file.size > 0) {
    const saved = await saveUploadedFile(file, "site-mou");
    if ("error" in saved) return { error: saved.error };
    mouDocumentUrl = saved.url;
  }

  const site = await prisma.clinicalSite.create({
    data: {
      institutionId: coordinatorProfile.program.institutionId,
      name: parsed.data.name,
      location: parsed.data.location || null,
      contactName: parsed.data.contactName || null,
      contactPhone: parsed.data.contactPhone || null,
      contactEmail: parsed.data.contactEmail || null,
      mouStartDate: parseDate(parsed.data.mouStartDate),
      mouEndDate: parseDate(parsed.data.mouEndDate),
      maxStudentCapacity: parsed.data.maxStudentCapacity ?? null,
      mouDocumentUrl,
    },
  });

  redirect(`/coordinator/sites/${site.id}`);
}

export async function updateSite(
  siteId: string,
  _prevState: SiteFormState,
  formData: FormData
): Promise<SiteFormState> {
  const session = await requireRole("COORDINATOR");
  const coordinatorProfile = await getCoordinatorProfileByUserId(session.user.id);

  const site = await prisma.clinicalSite.findUnique({ where: { id: siteId } });
  if (!site || site.institutionId !== coordinatorProfile.program.institutionId) {
    return { error: "Site not found." };
  }

  const parsed = schema.safeParse({
    name: formData.get("name"),
    location: formData.get("location") || undefined,
    contactName: formData.get("contactName") || undefined,
    contactPhone: formData.get("contactPhone") || undefined,
    contactEmail: formData.get("contactEmail") || "",
    mouStartDate: formData.get("mouStartDate") || undefined,
    mouEndDate: formData.get("mouEndDate") || undefined,
    maxStudentCapacity: formData.get("maxStudentCapacity") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  let mouDocumentUrl: string | undefined;
  const file = formData.get("mouDocument");
  if (file instanceof File && file.size > 0) {
    const saved = await saveUploadedFile(file, "site-mou");
    if ("error" in saved) return { error: saved.error };
    mouDocumentUrl = saved.url;
  }

  await prisma.clinicalSite.update({
    where: { id: siteId },
    data: {
      name: parsed.data.name,
      location: parsed.data.location || null,
      contactName: parsed.data.contactName || null,
      contactPhone: parsed.data.contactPhone || null,
      contactEmail: parsed.data.contactEmail || null,
      mouStartDate: parseDate(parsed.data.mouStartDate),
      mouEndDate: parseDate(parsed.data.mouEndDate),
      maxStudentCapacity: parsed.data.maxStudentCapacity ?? null,
      ...(mouDocumentUrl ? { mouDocumentUrl } : {}),
    },
  });

  redirect(`/coordinator/sites/${siteId}`);
}
