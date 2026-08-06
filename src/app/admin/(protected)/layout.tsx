"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAdminAuth } from "@/context/admin-auth-context";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminHeader } from "@/components/admin/admin-header";

export default function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  const { admin, isLoading } = useAdminAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (isLoading) return;
    // 일반 회원(viewer) 계정도 같은 로그인 백엔드를 쓰므로, 세션이 있다는 것만으로
    // 관리 콘솔 접근을 허용하면 안 된다 — role이 admin이 아니면 그대로 튕겨낸다.
    if (!admin || admin.role !== "admin") router.replace("/admin/login");
  }, [isLoading, admin, router]);

  if (isLoading || !admin || admin.role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <div className="flex flex-1 flex-col">
        <AdminHeader />
        <main className="flex-1 bg-muted/30 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
