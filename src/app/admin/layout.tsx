import { AdminProviders } from "@/app/admin/admin-providers";

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <AdminProviders>{children}</AdminProviders>;
}
