import type { UserRole } from "@prisma/client";

// 순수 함수만 — Redis/DB에 의존하지 않아 단위 테스트가 가능하다.
export function hasRole(role: UserRole, allowed: UserRole[]): boolean {
  return allowed.includes(role);
}
