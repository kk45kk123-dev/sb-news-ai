"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, LogOut, Menu } from "lucide-react";
import { toast } from "sonner";
import { useAdminAuth } from "@/context/admin-auth-context";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AdminMobileNav } from "@/components/admin/admin-mobile-nav";

const ROLE_LABEL: Record<string, string> = { admin: "관리자", editor: "편집자", viewer: "열람자" };

export function AdminHeader() {
  const { admin, logout } = useAdminAuth();
  const router = useRouter();

  if (!admin) return null;

  return (
    <header className="flex h-16 items-center gap-3 border-b border-border bg-card px-4 lg:px-6">
      <AdminMobileNav />
      <div className="flex-1" />
      <Button asChild variant="ghost" size="sm" className="gap-1 text-muted-foreground">
        <Link href="/" target="_blank">
          <ExternalLink className="h-3.5 w-3.5" /> 사이트 보기
        </Link>
      </Button>
      <ThemeToggle />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className="flex items-center gap-2 rounded-full pl-1 pr-2.5 py-1 transition-colors hover:bg-muted">
            <Avatar className="h-7 w-7 text-xs">
              <AvatarFallback>{admin.name.slice(0, 1)}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-semibold">{admin.name}</span>
            <Badge variant="outline" className="text-[10px]">
              {ROLE_LABEL[admin.role]}
            </Badge>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel>
            <p className="font-semibold">{admin.name}</p>
            <p className="text-xs font-normal text-muted-foreground">{admin.email}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              logout();
              toast.success("로그아웃되었습니다.");
              router.push("/admin/login");
            }}
          >
            <LogOut className="h-4 w-4" /> 로그아웃
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
