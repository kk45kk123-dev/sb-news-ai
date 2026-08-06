import { describe, it, expect } from "vitest";
import { hasRole } from "@/server/auth/rbac";

describe("hasRole", () => {
  it("허용 목록에 있는 역할은 통과한다", () => {
    expect(hasRole("admin", ["admin"])).toBe(true);
  });

  it("허용 목록에 없는 역할은 거부한다", () => {
    expect(hasRole("viewer", ["admin"])).toBe(false);
  });

  it("빈 허용 목록은 항상 거부한다", () => {
    expect(hasRole("admin", [])).toBe(false);
  });
});
