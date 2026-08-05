import type { NextRequest } from "next/server";
import { apiOk, apiError } from "@/lib/api-response";
import { ErrorCode } from "@/types/errors";
import { getAuthContext, hasRole } from "@/server/auth/guard";
import { listOrgUsers } from "@/server/repositories/user.repository";

/** Real user list for the admin "사용자 관리" screen — replaces src/data/mock-users.ts. */
export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return apiError(ErrorCode.UNAUTHORIZED, "로그인이 필요합니다.", 401);
  if (!hasRole(ctx.user.role, ["admin"])) {
    return apiError(ErrorCode.FORBIDDEN, "관리자만 접근할 수 있습니다.", 403);
  }

  const users = await listOrgUsers(ctx.user.orgId);
  return apiOk(
    users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      joinedAt: u.createdAt.toISOString(),
      lastActiveAt: u.lastLoginAt?.toISOString() ?? null,
      status: u.isActive ? "active" : "suspended",
    }))
  );
}
