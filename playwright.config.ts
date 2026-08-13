import { defineConfig, devices } from "@playwright/test";

/**
 * vitest(tests/unit)와 분리된 E2E 스위트. 실제 로컬 Postgres/Redis + 실행 중인
 * dev 서버를 전제로 한다 — tests/setup.ts의 더미 env(순수 로직 단위테스트용)와
 * 달리, 여기서는 .env의 실제 DATABASE_URL/REDIS_URL을 그대로 쓴다.
 *
 * 실행: npm run test:e2e (webServer가 dev 서버를 자동으로 띄운다)
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false, // globalSetup이 심은 고정 테스트 기사 ID를 여러 파일이 공유한다
  retries: 0,
  reporter: [["list"]],
  globalSetup: "./tests/e2e/global-setup.ts",
  globalTeardown: "./tests/e2e/global-teardown.ts",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // 이 샌드박스엔 사전 설치된 Chromium이 별도 경로에 있다 — 기본 다운로드
    // 채널 대신 그걸 그대로 쓴다 (PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1).
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined },
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-375", use: { viewport: { width: 375, height: 812 } } },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
