"use client";

import * as React from "react";
import type { LoginInput, SignupInput, User } from "@/lib/schemas/user.schema";

const STORAGE_KEY = "sb-news-user";

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

/**
 * Mock session, no real backend. Login/signup "succeed" once the form passes
 * Zod validation and persist a fake user to localStorage. Swap the two async
 * functions below for real Supabase Auth calls — everything else (UI,
 * navbar, gating) already talks only to this context.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {
      // ignore malformed storage
    }
    setIsLoading(false);
  }, []);

  const persist = (u: User) => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    setUser(u);
  };

  const login = React.useCallback(async (input: LoginInput) => {
    await delay(600);
    const fake: User = {
      id: `u-${input.email}`,
      name: input.email.split("@")[0] ?? input.email,
      email: input.email,
      createdAt: new Date().toISOString(),
    };
    persist(fake);
    return fake;
  }, []);

  const signup = React.useCallback(async (input: SignupInput) => {
    await delay(700);
    const fake: User = {
      id: `u-${input.email}`,
      name: input.name,
      email: input.email,
      createdAt: new Date().toISOString(),
    };
    persist(fake);
    return fake;
  }, []);

  const logout = React.useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  const value = React.useMemo(() => ({ user, isLoading, login, signup, logout }), [user, isLoading, login, signup, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
