const CSRF_COOKIE_NAME = "sb_csrf"; // src/server/auth/constants.ts와 동일한 값 (클라이언트에서 import 불가하므로 중복 정의)

/** 상태 변경 요청에 x-csrf-token 헤더로 실어 보낼 값을 non-HttpOnly 쿠키에서 읽는다. */
export function getCsrfToken(): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${CSRF_COOKIE_NAME}=([^;]*)`));
  return match ? decodeURIComponent(match[1]!) : null;
}
