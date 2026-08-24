/**
 * F-07 백필: article_embeddings는 이 기능 도입 전까지 비어 있었다 — 이미 분석이 끝난
 * (관리자 수동 게시 등) 기존 기사들에 임베딩을 만들어준다. 신규 게시/수정/자동분석은
 * manual-publish.service.ts / analysis.service.ts가 실시간으로 처리하므로, 이 스크립트는
 * "그 이전에 쌓인 기사"를 한 번 따라잡기 위한 1회성 도구다 — seed-sources.ts와 달리
 * 배포 파이프라인(npm run build)에는 넣지 않는다(OPENAI_API_KEY 필요 + 매 배포마다
 * 돌릴 이유가 없음).
 *
 * 실행: npx tsx scripts/backfill-embeddings.ts
 */
import { PrismaClient } from "@prisma/client";
import { generateArticleEmbedding } from "@/server/services/embedding.service";

const prisma = new PrismaClient();

async function main() {
  const targets = await prisma.article.findMany({
    where: {
      analyses: { some: { isCurrent: true } },
      embeddings: { none: { chunkType: "analysis" } },
    },
    select: { id: true, title: true },
  });

  console.log(`대상 기사 ${targets.length}건`);

  let done = 0;
  for (const article of targets) {
    await generateArticleEmbedding(article.id);
    done += 1;
    console.log(`  [${done}/${targets.length}] ${article.title}`);
  }

  console.log(`✔ 임베딩 백필 완료: ${done}건`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
