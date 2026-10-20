"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";
import { getCoordinatorProfileByUserId } from "@/lib/coordinator";
import { newWardNames, normalizeWardName } from "@/lib/ward";

// A site's wards (SiteDepartment rows): what students choose from first when
// logging a case, and what a rotation can be placed on.

export type WardResult = { ok: true; message?: string } | { ok: false; error: string };

async function ownSite(siteId: string) {
  const session = await requireRole("COORDINATOR");
  const coordinatorProfile = await getCoordinatorProfileByUserId(session.user.id);
  const site = await prisma.clinicalSite.findUnique({ where: { id: siteId }, include: { departments: true } });
  if (!site || site.institutionId !== coordinatorProfile.program.institutionId) return null;
  return site;
}

export async function addWards(siteId: string, input: string): Promise<WardResult> {
  const site = await ownSite(siteId);
  if (!site) return { ok: false, error: "Site not found." };
  const names = newWardNames(input, site.departments.map((d) => d.name));
  if (names.length === 0) return { ok: false, error: "Enter at least one new ward name." };
  for (const name of names) {
    await prisma.siteDepartment.create({ data: { clinicalSiteId: site.id, name } });
  }
  revalidatePath(`/coordinator/sites/${siteId}`);
  return { ok: true, message: `Added ${names.length} ward${names.length === 1 ? "" : "s"}.` };
}

export async function renameWard(siteId: string, wardId: string, newName: string): Promise<WardResult> {
  const site = await ownSite(siteId);
  if (!site) return { ok: false, error: "Site not found." };
  const ward = site.departments.find((d) => d.id === wardId);
  if (!ward) return { ok: false, error: "Ward not found." };
  const name = normalizeWardName(newName);
  if (!name) return { ok: false, error: "Enter a ward name." };
  if (site.departments.some((d) => d.id !== wardId && d.name.toLowerCase() === name.toLowerCase())) {
    return { ok: false, error: `This site already has a ward called ${name}.` };
  }
  await prisma.siteDepartment.update({ where: { id: ward.id }, data: { name } });
  revalidatePath(`/coordinator/sites/${siteId}`);
  return { ok: true };
}

// Only a ward no rotation or capacity plan uses can be removed; past cases
// keep their ward name either way (it's stored on each case).
export async function removeWard(siteId: string, wardId: string): Promise<WardResult> {
  const site = await ownSite(siteId);
  if (!site) return { ok: false, error: "Site not found." };
  const ward = site.departments.find((d) => d.id === wardId);
  if (!ward) return { ok: false, error: "Ward not found." };
  const [rotations, capacities] = await Promise.all([
    prisma.rotation.count({ where: { siteDepartmentId: ward.id } }),
    prisma.siteCapacityWindow.count({ where: { siteDepartmentId: ward.id } }),
  ]);
  if (rotations > 0 || capacities > 0) {
    return {
      ok: false,
      error: `${ward.name} is used by ${rotations} rotation${rotations === 1 ? "" : "s"}${capacities > 0 ? " and a capacity plan" : ""}, so it can't be removed. Rename it instead.`,
    };
  }
  await prisma.siteDepartment.delete({ where: { id: ward.id } });
  revalidatePath(`/coordinator/sites/${siteId}`);
  return { ok: true };
}
