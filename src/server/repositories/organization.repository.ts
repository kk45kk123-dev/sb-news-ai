import { prisma } from "@/server/db/client";
import type { Prisma } from "@prisma/client";

export async function getOrgSettingsRaw(orgId: string): Promise<unknown> {
  const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { settings: true } });
  return org?.settings ?? {};
}

export async function updateOrgSettingsRaw(orgId: string, settings: Prisma.InputJsonValue): Promise<void> {
  await prisma.organization.update({ where: { id: orgId }, data: { settings } });
}
