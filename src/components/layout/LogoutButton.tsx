"use client";

import { useRouter } from "next/navigation";
import { getCsrfToken } from "@/lib/csrf-client";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/v1/auth/logout", {
      method: "POST",
      headers: { "x-csrf-token": getCsrfToken() ?? "" },
    });
    router.push("/login");
    router.refresh();
  }

  return (
    <button type="button" onClick={handleLogout} className="text-sm text-text-muted hover:text-text">
      로그아웃
    </button>
  );
}
