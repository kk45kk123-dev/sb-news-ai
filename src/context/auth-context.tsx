"use client";

import * as React from "react";
import type { LoginInput, SignupInput, User } from "@/lib/schemas/user.schema";
import { apiFetch } from "@/lib/api/http";
import { getCsrfToken } from "@/lib/csrf-client";

const SIGNUP_STORAGE_KEY = "sb-news-user"; // still mock — see signup() below

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<User>;
  signup: (input: SignupInput) => Promise<User>;
  logout: () => void;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface MeResponse {
  id: string;
  name: string;
  email: string;
}

/**
 * login()/logout() are backed by the real session/CSRF system at /api/v1/auth/*
 * (the same one admin login uses) — reader accounts are the pre-seeded demo
 * accounts (scripts/seed-admin-users.ts) until a real self-registration API
 * exists. signup() is intentionally still a local-only mock: it has no real
 * backend endpoint to call, and adding one is out of scope for this pass
 * (see Sprint 2 report — "회원가입" was not one of the 10 required items).
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    apiFetch<MeResponse>("/api/v1/auth/me")
      .then((me) => setUser({ ...me, createdAt: new Date().toISOString() }))
      .catch(() => {
        try {
          const raw = window.localStorage.getItem(SIGNUP_STORAGE_KEY);
          if (raw) setUser(JSON.parse(raw));
        } catch {
          // ignore malformed storage
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = React.useCallback(async (input: LoginInput) => {
    const res = await fetch("/api/v1/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.success) {
      throw new Error(body?.error?.message ?? "로그인에 실패했습니다.");
    }
    const real: User = { ...body.data.user, createdAt: new Date().toISOString() };
    window.localStorage.removeItem(SIGNUP_STORAGE_KEY); // real session now takes priority
    setUser(real);
    return real;
  }, []);

  const signup = React.useCallback(async (input: SignupInput) => {
    await delay(700);
    const fake: User = {
      id: `u-${input.email}`,
      name: input.name,
      email: input.email,
      createdAt: new Date().toISOString(),
    };
    window.localStorage.setItem(SIGNUP_STORAGE_KEY, JSON.stringify(fake));
    setUser(fake);
    return fake;
  }, []);

  const logout = React.useCallback(() => {
    window.localStorage.removeItem(SIGNUP_STORAGE_KEY);
    fetch("/api/v1/auth/logout", {
      method: "POST",
      headers: { "x-csrf-token": getCsrfToken() ?? "" },
    }).finally(() => setUser(null));
  }, []);

  const value = React.useMemo(() => ({ user, isLoading, login, signup, logout }), [user, isLoading, login, signup, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
