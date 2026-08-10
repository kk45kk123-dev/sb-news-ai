import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiOk, apiError } from "@/lib/api-response";
import { ErrorCode } from "@/types/errors";
import { getAuthContext, hasRole, verifyCsrf } from "@/server/auth/guard";
import { recordAudit } from "@/server/services/audit.service";
import { publishManualArticle, DuplicateArticleError } from "@/server/services/manual-publish.service";
import { getOrgSettings } from "@/server/services/settings.service";

const publishRequestSchema = z.object({
  title: z.string().min(1),
  categoryId: z.string().min(1),
  summaryBullets: z.array(z.string()).min(1),
  keywords: z.array(z.string()).default([]),
  body: z.string().min(1),
  sourceUrl: z.string().url().nullable(),
  modelKey: z.string().min(1),
  tokenInput: z.number().int().nonnegative(),
  tokenOutput: z.number().int().nonnegative(),
  latencyMs: z.number().int().nonnegative(),
});

/**
 * Persists a manually-reviewed article (from the "기사 등록" ingest flow) as a
 * real Article + Analysis row. Distinct from the automated collector pipeline
 * — see manual-publish.service.ts for what's intentionally simplified here.
 */
export async function POST(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return apiError(ErrorCode.UNAUTHORIZED, "로그인이 필요합니다.", 401);
  if (!hasRole(ctx.user.role, ["admin"])) {
    return apiError(ErrorCode.FORBIDDEN, "기사 게시 권한이 없습니다.", 403);
  }
  if (!verifyCsrf(req, ctx)) {
    return apiError(ErrorCode.CSRF_MISMATCH, "CSRF 토큰이 유효하지 않습니다.", 403);
  }

  const parsed = publishRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return apiError(ErrorCode.VALIDATION_ERROR, parsed.error.issues[0]?.message ?? "잘못된 요청입니다.", 400);
  }

  try {
    const settings = await getOrgSettings(ctx.user.orgId);
    const { articleId, status } = await publishManualArticle({
      ...parsed.data,
      orgId: ctx.user.orgId,
      userId: ctx.user.id,
      status: settings.autoPublish ? "published" : "draft",
    });

    try {
      await recordAudit({
        orgId: ctx.user.orgId,
        userId: ctx.user.id,
        action: "admin.article.publish_manual",
        targetType: "article",
        targetId: articleId,
        after: { title: parsed.data.title, sourceUrl: parsed.data.sourceUrl, status },
      });
    } catch (auditError) {
      // Publish already committed — don't fail the request over an audit-log write.
      console.error("[admin/articles] recordAudit failed after successful publish", auditError);
    }

    return apiOk({ articleId, status }, undefined, 201);
  } catch (e) {
    if (e instanceof DuplicateArticleError) {
      return apiError(ErrorCode.VALIDATION_ERROR, "이미 게시된 기사입니다 (동일 URL 또는 동일 본문).", 409);
    }
    console.error("[admin/articles] publish failed", e);
    return apiError(ErrorCode.INTERNAL_ERROR, "기사 저장 중 오류가 발생했습니다.", 500);
  }
}
