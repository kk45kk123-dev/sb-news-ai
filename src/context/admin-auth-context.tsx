"use client";

import * as React from "react";
import type { Admin, AdminLoginInput, AdminRole } from "@/lib/schemas/user.schema";

const STORAGE_KEY = "sb-news-admin";

export const DEMO_ADMINS: Record<string, { name: string; role: AdminRole }> = {
  "admin@sbfederation.or.kr": { name: "김관리", role: "admin" },
  "editor@sbfederation.or.kr": { name: "박편집", role: "editor" },
  "viewer@sbfederation.or.kr": { name: "이열람", role: "viewer" },
};

interface AdminAuthContextValue {
  admin: Admin | null;
  isLoading: boolean;
  login: (input: AdminLoginInput) => Promise<Admin>;
  logout: () => void;
  hasRole: (roles: AdminRole[]) => boolean;
}

const AdminAuthContext = React.createContext<AdminAuthContextValue | null>(null);

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Mock admin session with role claims, standing in for a real JWT-based flow:
 * a real backend would issue a signed token carrying { sub, role, exp } and
 * every admin API route would verify it server-side. Here the "claims" just
 * live in localStorage, but hasRole() below is written the same way a real
 * middleware guard would call it, so swapping in real auth later only means
 * replacing login()/the storage layer — every consumer already checks roles
 * through this one function.
 */
export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = React.useState<Admin | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setAdmin(JSON.parse(raw));
    } catch {
      // ignore malformed storage
    }
    setIsLoading(false);
  }, []);

  const login = React.useCallback(async (input: AdminLoginInput) => {
    await delay(600);
    const known = DEMO_ADMINS[input.email];
    const record: Admin = {
      id: `admin-${input.email}`,
      name: known?.name ?? input.email.split("@")[0] ?? input.email,
      email: input.email,
      role: known?.role ?? "viewer",
      lastLoginAt: new Date().toISOString(),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    setAdmin(record);
    return record;
  }, []);

  const logout = React.useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setAdmin(null);
  }, []);

  const hasRole = React.useCallback((roles: AdminRole[]) => !!admin && roles.includes(admin.role), [admin]);

  const value = React.useMemo(() => ({ admin, isLoading, login, logout, hasRole }), [admin, isLoading, login, logout, hasRole]);

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth(): AdminAuthContextValue {
  const ctx = React.useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}
