import { Prisma } from "@prisma/client";
import { findUserByEmail, createUser, updateLastLogin } from "@/server/repositories/user.repository";
import { verifyPassword, hashPassword } from "@/server/auth/password";
import { createSession, destroySession } from "@/server/auth/session";
import { recordAudit } from "./audit.service";

export interface LoginRequestContext {
  orgId: string;
  email: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface LoginResult {
  sessionToken: string;
  csrfToken: string;
  user: { id: string; name: string; email: string; role: string; department: string | null };
}

export class InvalidCredentialsError extends Error {}
export class DuplicateEmailError extends Error {}

export interface SignupRequestContext {
  orgId: string;
  name: string;
  email: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * 로그인 성공/실패 모두 audit_logs에 남긴다 (§16.5: "로그인/로그아웃(성공·실패)").
 * 비활성 계정(is_active=false)은 비밀번호가 맞아도 로그인할 수 없다.
 */
export async function login(ctx: LoginRequestContext): Promise<LoginResult> {
  const user = await findUserByEmail(ctx.orgId, ctx.email);

  const passwordOk =
    user?.passwordHash != null && (await verifyPassword(ctx.password, user.passwordHash));

  if (!user || !user.isActive || !passwordOk) {
    await recordAudit({
      orgId: ctx.orgId,
      userId: user?.id ?? null,
      action: "login_failed",
      targetType: "user",
      targetId: user?.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
    throw new InvalidCredentialsError("이메일 또는 비밀번호가 올바르지 않습니다.");
  }

  const { token, csrfToken } = await createSession(user.id);
  await updateLastLogin(user.id);
  await recordAudit({
    orgId: ctx.orgId,
    userId: user.id,
    action: "login",
    targetType: "user",
    targetId: user.id,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
  });

  return {
    sessionToken: token,
    csrfToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
    },
  };
}

/**
 * 회원가입 — 이메일 중복 시 DuplicateEmailError, 성공 시 즉시 세션을 발급한다
 * (자동 로그인). role은 항상 viewer로 고정 — 관리자/편집자 권한은 셀프 서비스로
 * 부여할 수 없다 (관리자 계정은 scripts/seed-admin-users.ts 또는 향후 관리자
 * 승격 기능으로만 생성).
 */
export async function signup(ctx: SignupRequestContext): Promise<LoginResult> {
  const existing = await findUserByEmail(ctx.orgId, ctx.email);
  if (existing) {
    throw new DuplicateEmailError("이미 가입된 이메일입니다.");
  }

  const passwordHash = await hashPassword(ctx.password);

  let user;
  try {
    user = await createUser({
      orgId: ctx.orgId,
      name: ctx.name,
      email: ctx.email,
      passwordHash,
      role: "viewer",
    });
  } catch (e) {
    // Race: two signups for the same email landed between our findUserByEmail
    // check and the insert — the orgId+email unique constraint catches it.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new DuplicateEmailError("이미 가입된 이메일입니다.");
    }
    throw e;
  }

  const { token, csrfToken } = await createSession(user.id);
  await updateLastLogin(user.id);
  await recordAudit({
    orgId: ctx.orgId,
    userId: user.id,
    action: "signup",
    targetType: "user",
    targetId: user.id,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
  });

  return {
    sessionToken: token,
    csrfToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
    },
  };
}

export async function logout(
  sessionToken: string,
  orgId: string,
  userId: string,
  meta: { ipAddress?: string; userAgent?: string }
): Promise<void> {
  await destroySession(sessionToken);
  await recordAudit({
    orgId,
    userId,
    action: "logout",
    targetType: "user",
    targetId: userId,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });
}
