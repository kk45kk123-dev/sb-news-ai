import type { KeywordWatch } from "@prisma/client";
import {
  listUserWatches,
  countUserWatches,
  createWatch,
  deleteWatch,
  findMatchingWatches,
} from "@/server/repositories/keyword-watch.repository";
import { createNotification } from "@/server/repositories/notification.repository";

const MAX_WATCHES_PER_USER = 20;

export class TooManyWatchesError extends Error {
  constructor() {
    super(`키워드 워치는 최대 ${MAX_WATCHES_PER_USER}개까지 등록할 수 있습니다.`);
  }
}

export class DuplicateWatchError extends Error {
  constructor() {
    super("이미 등록된 키워드입니다.");
  }
}

export async function getMyWatches(userId: string): Promise<KeywordWatch[]> {
  return listUserWatches(userId);
}

export async function addWatch(userId: string, keyword: string, minImpact?: number): Promise<KeywordWatch> {
  const [count, existing] = await Promise.all([countUserWatches(userId), listUserWatches(userId)]);
  if (count >= MAX_WATCHES_PER_USER) throw new TooManyWatchesError();
  if (existing.some((w) => w.keyword.toLowerCase() === keyword.toLowerCase())) throw new DuplicateWatchError();

  return createWatch({ userId, keyword, minImpact });
}

export async function removeWatch(id: string, userId: string): Promise<boolean> {
  return deleteWatch(id, userId);
}

/**
 * F-08 축소판(인앱 알림만). 기사 게시 직후 호출한다 — 이 조직의 활성 키워드 워치와 매칭되는
 * 사용자 전원에게 알림을 하나씩 만든다. 실패해도 게시 자체를 막으면 안 되므로 호출부에서
 * best-effort로 감싼다(embedding.service.ts와 같은 원칙).
 */
export async function notifyKeywordWatchers(input: {
  orgId: string;
  articleId: string;
  title: string;
  summaryLines: string[];
  keywords: string[];
  sbImpactScore: number;
}): Promise<void> {
  const articleText = [input.title, ...input.summaryLines, ...input.keywords].join(" ");
  const matches = await findMatchingWatches(input.orgId, articleText, input.sbImpactScore);
  if (matches.length === 0) return;

  // 한 사용자가 등록한 여러 키워드가 동시에 매칭돼도 기사당 알림은 하나만 보낸다.
  const byUser = new Map<string, string[]>();
  for (const m of matches) {
    byUser.set(m.userId, [...(byUser.get(m.userId) ?? []), m.keyword]);
  }

  await Promise.all(
    Array.from(byUser.entries()).map(([userId, keywords]) =>
      createNotification({
        userId,
        type: "keyword_watch",
        title: `"${keywords.join(", ")}" 관련 새 기사`,
        body: input.title,
        link: `/news/${input.articleId}`,
      })
    )
  );
}
