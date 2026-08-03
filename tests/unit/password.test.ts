import { describe, it, expect } from "vitest";
import { validatePasswordPolicy, hashPassword, verifyPassword } from "@/server/auth/password";

describe("validatePasswordPolicy", () => {
  it("12자 미만은 거부한다", () => {
    expect(validatePasswordPolicy("short1234")).not.toBeNull();
  });

  it("12자 이상은 통과한다", () => {
    expect(validatePasswordPolicy("longenoughpassword")).toBeNull();
  });
});

describe("hashPassword / verifyPassword", () => {
  it("올바른 비밀번호는 검증을 통과한다", async () => {
    const hash = await hashPassword("correct-horse-battery-staple");
    await expect(verifyPassword("correct-horse-battery-staple", hash)).resolves.toBe(true);
  });

  it("틀린 비밀번호는 검증에 실패한다", async () => {
    const hash = await hashPassword("correct-horse-battery-staple");
    await expect(verifyPassword("wrong-password", hash)).resolves.toBe(false);
  });

  it("같은 비밀번호도 매번 다른 해시를 생성한다 (salt)", async () => {
    const hash1 = await hashPassword("same-password-123");
    const hash2 = await hashPassword("same-password-123");
    expect(hash1).not.toBe(hash2);
  });
});
