// E2E 스위트 전체가 공유하는 고정 기사 ID/제목 — global-setup.ts가 심고,
// global-teardown.ts가 지운다. spec 파일들은 이 값을 그대로 import해서 쓴다.
export const E2E_ARTICLE_TITLE = "E2E테스트: 저축은행 예금금리와 DSR 관련 기사";
export const E2E_ARTICLE_URL = "https://e2e-test.example/fixed-article";
export const E2E_MARKER_PUBLISHER = "E2E테스트";
