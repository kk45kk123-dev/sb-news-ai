// 테스트 실행 시 모듈 import 시점에 실행되는 env 검증(src/config/env.ts, fail-fast)이
// 통과할 수 있도록 더미 값을 채운다. 실제 DB/Redis에 연결하지 않는 순수 로직 테스트만
// 이 값들을 사용한다 — 통합 테스트는 별도 환경(Docker)에서 실행한다.
process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";
process.env.REDIS_URL ??= "redis://localhost:6379";
process.env.SESSION_SECRET ??= "test-session-secret-at-least-32-characters";
process.env.APP_BASE_URL ??= "http://localhost:3000";
process.env.ANTHROPIC_API_KEY ??= "sk-ant-test-placeholder";
