import { PrismaClient } from "@prisma/client";
import { E2E_MARKER_PUBLISHER } from "./fixtures";

/** global-setup.ts와 admin-flows.spec.ts가 만든 테스트 기사를 전부 정리한다. */
export default async function globalTeardown() {
  const prisma = new PrismaClient();
  try {
    const result = await prisma.article.deleteMany({ where: { publisher: E2E_MARKER_PUBLISHER } });
    console.log(`[e2e global-teardown] removed ${result.count} article(s)`);
  } finally {
    await prisma.$disconnect();
  }
}
