"use client";

import * as React from "react";
import type { LoginInput, SignupInput, User } from "@/lib/schemas/user.schema";
import { apiFetch } from "@/lib/api/http";
import { getCsrfToken } from "@/lib/csrf-client";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<User>;
  signup: (input: SignupInput) => Promise<User>;
  logout: () => void;
  updateProfileName: (name: string) => Promise<User>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

interface MeResponse {
  id: string;
  name: string;
  email: string;
}

interface AuthApiResponse {
  success: boolean;
  data?: { user: { id: string; name: string; email: string } };
  error?: { message: string };
}

/**
 * login()/signup()/logout() are all backed by the real session/CSRF system at
 * /api/v1/auth/* (the same one admin login uses — Sprint 1 wired login,
 * Sprint 3 added signup). No local fallback state anymore; a logged-out
 * visitor is just user=null.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    apiFetch<MeResponse>("/api/v1/auth/me")
      .then((me) => setUser({ ...me, createdAt: new Date().toISOString() }))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  const login = React.useCallback(async (input: LoginInput) => {
    const res = await fetch("/api/v1/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    const body: AuthApiResponse | null = await res.json().catch(() => null);
    if (!res.ok || !body?.success || !body.data) {
      throw new Error(body?.error?.message ?? "로그인에 실패했습니다.");
    }
    const real: User = { ...body.data.user, createdAt: new Date().toISOString() };
    setUser(real);
    return real;
  }, []);

  const signup = React.useCallback(async (input: SignupInput) => {
    const res = await fetch("/api/v1/auth/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    const body: AuthApiResponse | null = await res.json().catch(() => null);
    if (!res.ok || !body?.success || !body.data) {
      throw new Error(body?.error?.message ?? "회원가입에 실패했습니다.");
    }
    const real: User = { ...body.data.user, createdAt: new Date().toISOString() };
    setUser(real);
    return real;
  }, []);

  const logout = React.useCallback(() => {
    fetch("/api/v1/auth/logout", {
      method: "POST",
      headers: { "x-csrf-token": getCsrfToken() ?? "" },
    }).finally(() => setUser(null));
  }, []);

  const updateProfileName = React.useCallback(async (name: string) => {
    const updated = await apiFetch<MeResponse>("/api/v1/auth/me", {
      method: "PATCH",
      body: JSON.stringify({ name }),
    });
    const real: User = { ...updated, createdAt: new Date().toISOString() };
    setUser(real);
    return real;
  }, []);

  const value = React.useMemo(
    () => ({ user, isLoading, login, signup, logout, updateProfileName }),
    [user, isLoading, login, signup, logout, updateProfileName]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
