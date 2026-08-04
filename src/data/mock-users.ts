export interface MockUser {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin" | "editor" | "viewer";
  joinedAt: string;
  lastActiveAt: string;
  status: "active" | "suspended";
}

export const MOCK_USERS: MockUser[] = [
  { id: "u1", name: "김관리", email: "admin@sbfederation.or.kr", role: "admin", joinedAt: "2025-11-02", lastActiveAt: "2026-08-04T08:52:00+09:00", status: "active" },
  { id: "u2", name: "박편집", email: "editor@sbfederation.or.kr", role: "editor", joinedAt: "2025-12-14", lastActiveAt: "2026-08-04T08:10:00+09:00", status: "active" },
  { id: "u3", name: "이열람", email: "viewer@sbfederation.or.kr", role: "viewer", joinedAt: "2026-01-20", lastActiveAt: "2026-08-03T19:41:00+09:00", status: "active" },
  { id: "u4", name: "정수신", email: "jsy@sb-savings.co.kr", role: "user", joinedAt: "2026-02-18", lastActiveAt: "2026-08-04T07:30:00+09:00", status: "active" },
  { id: "u5", name: "최여신", email: "cyb@sb-savings.co.kr", role: "user", joinedAt: "2026-03-05", lastActiveAt: "2026-08-02T15:12:00+09:00", status: "active" },
  { id: "u6", name: "한리스크", email: "hjw@sb-savings.co.kr", role: "user", joinedAt: "2026-03-22", lastActiveAt: "2026-07-30T11:02:00+09:00", status: "suspended" },
  { id: "u7", name: "윤전략", email: "yss@sb-savings.co.kr", role: "user", joinedAt: "2026-04-11", lastActiveAt: "2026-08-04T06:45:00+09:00", status: "active" },
];
