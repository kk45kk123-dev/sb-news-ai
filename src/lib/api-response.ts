import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import type { ErrorCode } from "@/types/errors";

// §9.1 API 응답 포맷 통일.
export function apiOk<T>(data: T, meta?: Record<string, unknown>, status = 200) {
  return NextResponse.json({ success: true, data, meta }, { status });
}

export function apiError(code: ErrorCode, message: string, status: number) {
  return NextResponse.json(
    { success: false, error: { code, message, traceId: randomUUID() } },
    { status }
  );
}
