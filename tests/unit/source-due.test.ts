import { describe, it, expect } from "vitest";
import { isSourceDue } from "@/server/repositories/source.repository";

describe("isSourceDue", () => {
  const now = new Date("2026-08-03T09:00:00Z");

  it("한 번도 수집된 적 없으면 항상 due다", () => {
    expect(isSourceDue({ lastFetchedAt: null, fetchIntervalMin: 30 }, now)).toBe(true);
  });

  it("주기가 지나지 않았으면 due가 아니다", () => {
    const lastFetchedAt = new Date("2026-08-03T08:50:00Z"); // 10분 전, 주기 30분
    expect(isSourceDue({ lastFetchedAt, fetchIntervalMin: 30 }, now)).toBe(false);
  });

  it("주기가 지났으면 due다", () => {
    const lastFetchedAt = new Date("2026-08-03T08:20:00Z"); // 40분 전, 주기 30분
    expect(isSourceDue({ lastFetchedAt, fetchIntervalMin: 30 }, now)).toBe(true);
  });

  it("정확히 주기 경계면 due다 (경계 포함)", () => {
    const lastFetchedAt = new Date("2026-08-03T08:30:00Z"); // 정확히 30분 전
    expect(isSourceDue({ lastFetchedAt, fetchIntervalMin: 30 }, now)).toBe(true);
  });
});
