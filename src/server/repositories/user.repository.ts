import { prisma } from "@/server/db/client";
import type { User } from "@prisma/client";

export async function findUserByEmail(orgId: string, email: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { orgId_email: { orgId, email } } });
}

export async function findUserById(id: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } });
}

export async function updateLastLogin(id: string): Promise<void> {
  await prisma.user.update({ where: { id }, data: { lastLoginAt: new Date() } });
}
