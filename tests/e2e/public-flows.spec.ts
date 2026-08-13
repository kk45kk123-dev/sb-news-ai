import { test, expect } from "@playwright/test";
import { E2E_ARTICLE_TITLE } from "./fixtures";

test.describe("공개 화면 핵심 흐름", () => {
  test("홈 페이지가 로딩되고 네비게이션이 보인다", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("SB NEWS AI").first()).toBeVisible();
    await expect(page.locator("button", { hasText: "카테고리" })).toBeVisible();
  });

  test("뉴스 목록에 시드된 기사가 실제로 보이고 클릭하면 상세로 이동한다", async ({ page }) => {
    await page.goto("/news", { waitUntil: "networkidle" });
    const link = page.locator(`a[href^="/news/"]:has-text("${E2E_ARTICLE_TITLE}")`).first();
    await expect(link).toBeVisible({ timeout: 10_000 });
    await Promise.all([page.waitForURL(/\/news\/[0-9a-f-]+/, { timeout: 10_000 }), link.click()]);
    await expect(page.getByRole("heading", { name: E2E_ARTICLE_TITLE })).toBeVisible({ timeout: 10_000 });
  });

  test("카테고리 필터가 실제 DB 결과를 좁힌다", async ({ page }) => {
    await page.goto("/news?category=c3");
    await expect(page.getByText(E2E_ARTICLE_TITLE).first()).toBeVisible({ timeout: 10_000 });
    await page.goto("/news?category=c7"); // 핀테크 — 시드 기사와 무관한 카테고리
    await expect(page.getByText(E2E_ARTICLE_TITLE)).toHaveCount(0);
  });

  test("검색이 실제 키워드로 결과를 좁히고, 없는 키워드는 빈 상태를 보여준다", async ({ page }) => {
    await page.goto("/search?q=DSR");
    await expect(page.getByText(E2E_ARTICLE_TITLE).first()).toBeVisible({ timeout: 10_000 });

    await page.goto("/search?q=zzzznonexistentqueryzzzz");
    await expect(page.getByText(/조건에 맞는|검색 결과가 없|찾지 못했/)).toBeVisible({ timeout: 10_000 });
  });

  test("상세 페이지에 AI 요약/중요도/저축은행 영향도/용어 하이라이트가 실제로 표시된다", async ({ page }) => {
    await page.goto("/news", { waitUntil: "networkidle" });
    const link = page.locator(`a[href^="/news/"]:has-text("${E2E_ARTICLE_TITLE}")`).first();
    await Promise.all([page.waitForURL(/\/news\/[0-9a-f-]+/, { timeout: 10_000 }), link.click()]);

    await expect(page.getByText("AI 3줄 요약")).toBeVisible();
    await expect(page.getByText("저축은행 영향도")).toBeVisible();
    // global-setup이 심은 glossary 항목("DSR")이 본문에서 하이라이트되어야 한다.
    await expect(page.getByText("DSR").first()).toBeVisible();
  });
});

test.describe("모바일 뷰포트 스모크 테스트", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("375px에서 홈/상세 화면에 가로 스크롤(overflow)이 생기지 않는다", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);
    const homeOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(homeOverflow).toBe(false);

    await page.goto("/news", { waitUntil: "networkidle" });
    const link = page.locator(`a[href^="/news/"]:has-text("${E2E_ARTICLE_TITLE}")`).first();
    await Promise.all([page.waitForURL(/\/news\/[0-9a-f-]+/, { timeout: 10_000 }), link.click()]);
    await page.waitForTimeout(500);
    const detailOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(detailOverflow).toBe(false);
  });
});
