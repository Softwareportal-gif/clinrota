"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";
import { getInstitutionIdForUser } from "@/lib/admin";

export type CreateProgramState = { error?: string } | undefined;

export async function createProgram(
  _prevState: CreateProgramState,
  formData: FormData
): Promise<CreateProgramState> {
  const session = await requireRole("SUPER_ADMIN");
  const institutionId = await getInstitutionIdForUser(session.user.id);

  const name = String(formData.get("name") ?? "").trim();
  const degreeLevel = String(formData.get("degreeLevel") ?? "").trim();
  const disciplineTemplateId = String(formData.get("disciplineTemplateId") ?? "");
  const defaultMinCasesRaw = String(formData.get("defaultMinCases") ?? "").trim();
  const defaultMinHoursRaw = String(formData.get("defaultMinHours") ?? "").trim();

  if (!name) return { error: "Program name is required." };
  if (!disciplineTemplateId) return { error: "Select a discipline template." };

  const template = await prisma.disciplineTemplate.findUnique({
    where: { id: disciplineTemplateId },
  });
  if (!template) return { error: "That discipline template no longer exists." };

  await prisma.program.create({
    data: {
      institutionId,
      name,
      degreeLevel: degreeLevel || null,
      disciplineTemplateId,
      defaultMinCases: defaultMinCasesRaw ? Number(defaultMinCasesRaw) : null,
      defaultMinHours: defaultMinHoursRaw ? Number(defaultMinHoursRaw) : null,
    },
  });

  redirect("/admin");
}
