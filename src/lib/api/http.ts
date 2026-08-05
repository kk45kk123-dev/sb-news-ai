import { toast } from "sonner";
import { getCsrfToken } from "@/lib/csrf-client";

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
  }
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

/**
 * Shared client fetch wrapper for /api/v1/*: attaches CSRF on mutating
 * requests, and — unlike several ad hoc `fetch().then(r => r.json())` call
 * sites found in review — never assumes the response body is JSON. A crashed
 * or timed-out serverless function returns an HTML/plain-text error page,
 * which would otherwise throw an unhandled exception inside res.json().
 */
export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const method = init?.method ?? "GET";
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        ...(init?.body ? { "content-type": "application/json" } : {}),
        ...(method !== "GET" ? { "x-csrf-token": getCsrfToken() ?? "" } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiRequestError("서버에 연결할 수 없습니다. 네트워크 상태를 확인해주세요.", 0);
  }

  let body: ApiEnvelope<T> | null = null;
  try {
    body = await res.json();
  } catch {
    throw new ApiRequestError(`서버 응답을 처리하지 못했습니다 (HTTP ${res.status}).`, res.status);
  }

  if (!res.ok || !body?.success) {
    // A GET 401 is routine (every page optimistically checks /auth/me or
    // /my-activity for anonymous visitors) — only a *mutating* request
    // failing auth means a previously-logged-in session actually expired
    // mid-action, which is worth telling the user about explicitly instead
    // of just surfacing a generic "action failed" message.
    if (res.status === 401 && method !== "GET") {
      toast.error("세션이 만료되었습니다. 다시 로그인해주세요.");
    }
    throw new ApiRequestError(body?.error?.message ?? `요청이 실패했습니다 (HTTP ${res.status}).`, res.status);
  }
  return body.data as T;
}
