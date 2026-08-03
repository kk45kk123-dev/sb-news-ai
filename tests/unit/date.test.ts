import { describe, it, expect } from "vitest";
import { formatRelativeTime } from "@/lib/date";

describe("formatRelativeTime", () => {
  const now = new Date("2026-08-03T12:00:00Z");

  it("1분 미만은 '방금 전'", () => {
    expect(formatRelativeTime(new Date("2026-08-03T11:59:30Z"), now)).toBe("방금 전");
  });

  it("분 단위", () => {
    expect(formatRelativeTime(new Date("2026-08-03T11:45:00Z"), now)).toBe("15분 전");
  });

  it("시간 단위", () => {
    expect(formatRelativeTime(new Date("2026-08-03T09:00:00Z"), now)).toBe("3시간 전");
  });

  it("일 단위", () => {
    expect(formatRelativeTime(new Date("2026-08-01T12:00:00Z"), now)).toBe("2일 전");
  });
});
