"use client";

import * as React from "react";
import type { Admin, AdminLoginInput, AdminRole } from "@/lib/schemas/user.schema";
import { getCsrfToken } from "@/lib/csrf-client";

export const DEMO_ADMINS: Record<string, { name: string; role: AdminRole }> = {
  "admin@sbfederation.or.kr": { name: "김관리", role: "admin" },
};

interface AdminAuthContextValue {
  admin: Admin | null;
  isLoading: boolean;
  login: (input: AdminLoginInput) => Promise<Admin>;
  logout: () => void;
}

const AdminAuthContext = React.createContext<AdminAuthContextValue | null>(null);

interface MeResponse {
  success: boolean;
  data?: { id: string; name: string; email: string; role: AdminRole };
}
interface LoginResponse {
  success: boolean;
  data?: { user: { id: string; name: string; email: string; role: AdminRole } };
  error?: { message: string };
}

/**
 * Backed by the real session/CSRF cookies from /api/v1/auth/* (src/server/auth/**),
 * the same system the public-site login already uses — this used to be a pure
 * localStorage mock that accepted any password for a hardcoded email list, which
 * meant "admin" access had no real gate. See scripts/seed-admin-users.ts for the
 * demo accounts this now actually authenticates against.
 */
export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = React.useState<Admin | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/v1/auth/me")
      .then((res) => (res.ok ? (res.json() as Promise<MeResponse>) : null))
      .then((body) => {
        if (cancelled || !body?.data) return;
        setAdmin({ ...body.data, lastLoginAt: null });
      })
      .catch(() => {
        // Not logged in / session expired — admin stays null, layout redirects to login.
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = React.useCallback(async (input: AdminLoginInput) => {
    const res = await fetch("/api/v1/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    const body: LoginResponse = await res.json().catch(() => ({ success: false }));
    if (!res.ok || !body.success || !body.data) {
      throw new Error(body.error?.message ?? "로그인에 실패했습니다.");
    }
    const record: Admin = { ...body.data.user, lastLoginAt: new Date().toISOString() };
    setAdmin(record);
    return record;
  }, []);

  const logout = React.useCallback(() => {
    fetch("/api/v1/auth/logout", {
      method: "POST",
      headers: { "x-csrf-token": getCsrfToken() ?? "" },
    }).finally(() => setAdmin(null));
  }, []);

  const value = React.useMemo(() => ({ admin, isLoading, login, logout }), [admin, isLoading, login, logout]);

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth(): AdminAuthContextValue {
  const ctx = React.useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}
