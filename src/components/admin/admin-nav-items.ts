import {
  LayoutDashboard,
  Newspaper,
  PlusCircle,
  FolderKanban,
  Users,
  BarChart3,
  Settings,
  Rss,
  ScrollText,
} from "lucide-react";

export const ADMIN_NAV_ITEMS: { href: string; label: string; icon: typeof LayoutDashboard }[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/news", label: "뉴스 관리", icon: Newspaper },
  { href: "/admin/news/new", label: "기사 등록", icon: PlusCircle },
  { href: "/admin/categories", label: "카테고리 관리", icon: FolderKanban },
  { href: "/admin/users", label: "사용자 관리", icon: Users },
  { href: "/admin/stats", label: "통계", icon: BarChart3 },
  { href: "/admin/sources", label: "데이터 출처", icon: Rss },
  { href: "/admin/logs", label: "시스템 로그", icon: ScrollText },
  { href: "/admin/settings", label: "설정", icon: Settings },
];
