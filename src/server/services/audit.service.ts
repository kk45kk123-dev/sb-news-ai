import { prisma } from "@/server/db/client";
import type { Prisma } from "@prisma/client";

export interface RecordAuditInput {
  orgId: string;
  userId?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * audit_logs는 append-only다 (§16.5, §20-4) — 이 함수 외의 경로로 audit_logs에
 * 쓰기가 발생하지 않도록 한다. UPDATE/DELETE는 DB 권한 자체에서 막혀 있다
 * (prisma/migrations/20260803000000_init/migration.sql의 REVOKE 참조).
 */
export async function recordAudit(input: RecordAuditInput): Promise<void> {
  await prisma.auditLog.create({
    data: {
      orgId: input.orgId,
      userId: input.userId ?? null,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      before: input.before,
      after: input.after,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    },
  });
}
