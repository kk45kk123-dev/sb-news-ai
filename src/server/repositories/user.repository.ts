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

/** 삭제된(deletedAt 설정된) 사용자는 기본적으로 목록에서 숨긴다. */
export async function listOrgUsers(orgId: string): Promise<User[]> {
  return prisma.user.findMany({ where: { orgId, deletedAt: null }, orderBy: { createdAt: "desc" } });
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

/** org 경계를 넘어서 다른 조직 사용자를 건드리지 못하도록 orgId까지 함께 확인한다. */
export async function findOrgUserById(id: string, orgId: string): Promise<User | null> {
  return prisma.user.findFirst({ where: { id, orgId } });
}

export async function countActiveAdmins(orgId: string): Promise<number> {
  return prisma.user.count({ where: { orgId, role: "admin", isActive: true } });
}

export async function setUserActive(id: string, orgId: string, isActive: boolean): Promise<User | null> {
  const result = await prisma.user.updateMany({ where: { id, orgId }, data: { isActive } });
  if (result.count === 0) return null;
  return prisma.user.findUnique({ where: { id } });
}

export async function setUserRole(id: string, orgId: string, role: UserRole): Promise<User | null> {
  const result = await prisma.user.updateMany({ where: { id, orgId }, data: { role } });
  if (result.count === 0) return null;
  return prisma.user.findUnique({ where: { id } });
}

/**
 * 실제 행은 지우지 않는다 — chat_sessions/feedbacks가 이 사용자를 FK(ON DELETE
 * RESTRICT)로 참조하고 있어, 로그인 이력이 있는 계정을 진짜 DELETE하면 십중팔구
 * 실패한다. isActive를 함께 false로 둬서 로그인 차단은 기존 정지 로직이 그대로
 * 처리하고, deletedAt은 목록에서 숨기는 용도로만 쓴다.
 */
export async function softDeleteUser(id: string, orgId: string): Promise<User | null> {
  const result = await prisma.user.updateMany({
    where: { id, orgId, deletedAt: null },
    data: { isActive: false, deletedAt: new Date() },
  });
  if (result.count === 0) return null;
  return prisma.user.findUnique({ where: { id } });
}

export async function updateLastLogin(id: string): Promise<void> {
  await prisma.user.update({ where: { id }, data: { lastLoginAt: new Date() } });
}
