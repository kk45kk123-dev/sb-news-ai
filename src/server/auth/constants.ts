// 매직 넘버 금지 (§18.1) — 인증 관련 상수는 여기서만 관리한다.

export const SESSION_COOKIE_NAME = "sb_session";
export const CSRF_COOKIE_NAME = "sb_csrf";
export const SESSION_IDLE_TIMEOUT_SECONDS = 30 * 60; // §16.1: 유휴 30분 후 만료
export const SESSION_REDIS_PREFIX = "session:";
export const BCRYPT_COST_FACTOR = 12; // §16.1: bcrypt cost 12+
export const MIN_PASSWORD_LENGTH = 12; // §16.1: 최소 12자 정책
export const LOGIN_RATE_LIMIT_PER_MINUTE = 5; // §16.3
