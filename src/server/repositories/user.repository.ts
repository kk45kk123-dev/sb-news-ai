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
 *
 * email도 함께 변형해서 비워둔다 — (orgId, email) 유니크 제약 때문에, 그대로 두면
 * 삭제된 계정의 이메일로 회원가입을 다시 시도할 때 findUserByEmail()이 이 삭제된
 * 행을 계속 찾아내 "이미 가입된 이메일"로 막아버린다. 원래 이메일은 감사 로그의
 * before 스냅샷에 남겨 필요하면 나중에 확인할 수 있다.
 */
export async function softDeleteUser(id: string, orgId: string): Promise<User | null> {
  const target = await prisma.user.findFirst({ where: { id, orgId, deletedAt: null } });
  if (!target) return null;

  return prisma.user.update({
    where: { id },
    data: {
      isActive: false,
      deletedAt: new Date(),
      email: `deleted-${Date.now()}-${target.email}`,
    },
  });
}

export async function updateLastLogin(id: string): Promise<void> {
  await prisma.user.update({ where: { id }, data: { lastLoginAt: new Date() } });
}

/** 본인이 자신의 표시 이름을 바꾼다 — 세션은 매 요청마다 DB에서 새로 조회하므로
 *  (guard.ts의 resolveAuthContext) 별도 캐시 무효화 없이 다음 요청부터 즉시 반영된다. */
export async function updateUserName(id: string, name: string): Promise<User> {
  return prisma.user.update({ where: { id }, data: { name } });
}
