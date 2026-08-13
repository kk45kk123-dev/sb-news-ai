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

export async function listOrgUsers(orgId: string): Promise<User[]> {
  return prisma.user.findMany({ where: { orgId }, orderBy: { createdAt: "desc" } });
}

/** 시스템 이벤트(스크랩 실패, AI 예산 초과 등) 알림 수신 대상 — org의 관리자 전원. */
export async function findAdminUserIds(orgId: string): Promise<string[]> {
  const admins = await prisma.user.findMany({
    where: { orgId, role: "admin", isActive: true },
    select: { id: true },
  });
  return admins.map((u) => u.id);
}

export async function findUserById(id: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } });
}

export async function updateLastLogin(id: string): Promise<void> {
  await prisma.user.update({ where: { id }, data: { lastLoginAt: new Date() } });
}
