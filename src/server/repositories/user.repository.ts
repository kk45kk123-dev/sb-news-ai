import { prisma } from "@/server/db/client";
import type { User, UserRole } from "@prisma/client";

export async function findUserByEmail(orgId: string, email: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { orgId_email: { orgId, email } } });
}

export interface CreateUserInput {
  orgId: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
}

export async function createUser(input: CreateUserInput): Promise<User> {
  return prisma.user.create({ data: input });
}

export async function findUserById(id: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } });
}

export async function updateLastLogin(id: string): Promise<void> {
  await prisma.user.update({ where: { id }, data: { lastLoginAt: new Date() } });
}
