import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = "admin@sbfederation.or.kr";
const ADMIN_PASSWORD = "demo1234"; // scripts/seed-admin-users.ts 데모 계정 — 프로덕션에선 반드시 교체해야 함

async function loginAsAdmin(page: import("@playwright/test").Page) {
  await page.goto("/admin/login", { waitUntil: "networkidle" });
  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASSWORD);
  await Promise.all([page.waitForURL(/\/admin$/, { timeout: 15_000 }), page.click('button[type="submit"]')]);
}

test.describe("관리자 핵심 흐름", () => {
  test("로그인 성공 시 세션 쿠키가 발급되고 대시보드로 리다이렉트된다", async ({ page, context }) => {
    await loginAsAdmin(page);
    await expect(page).toHaveURL(/\/admin$/);

    const cookies = await context.cookies();
    const session = cookies.find((c) => c.name === "sb_session");
    expect(session).toBeTruthy();
    expect(session?.httpOnly).toBe(true);
  });

  test("잘못된 비밀번호는 로그인에 실패하고 보호된 페이지에도 못 들어간다", async ({ page }) => {
    await page.goto("/admin/login");
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', "wrong-password");
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1500);
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("비로그인 상태로 관리자 API를 직접 호출하면 401이 반환된다 (인증가드 확인)", async ({ request }) => {
    const res = await request.get("/api/v1/admin/settings");
    expect(res.status()).toBe(401);
  });

  test("기사 등록 화면에서 유효하지 않은 API 키로 AI 분석 시 사용자에게 명확한 오류가 표시된다", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/news/new");
    const textModeTab = page.getByRole("tab", { name: /원문/ }).or(page.locator("button", { hasText: "원문" }));
    if (await textModeTab.count()) await textModeTab.first().click();

    await page.locator("textarea").first().fill(
      "E2E 테스트를 위한 30자 이상의 임의 원문 텍스트입니다. AI 분석 버튼을 눌렀을 때 오류 처리를 확인합니다."
    );
    await page.locator("button", { hasText: "AI 분석" }).first().click();
    await expect(page.getByText(/ANTHROPIC_API_KEY|AI 분석.*실패|AI 분석 요청 중 오류/)).toBeVisible({ timeout: 15_000 });
  });
});
