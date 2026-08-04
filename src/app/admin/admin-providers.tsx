"use client";

import { AdminAuthProvider } from "@/context/admin-auth-context";

export function AdminProviders({ children }: { children: React.ReactNode }) {
  return <AdminAuthProvider>{children}</AdminAuthProvider>;
}
