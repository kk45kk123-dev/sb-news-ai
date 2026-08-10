import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { CategoriesProvider } from "@/context/categories-context";
import { applyCategoryNameOverrides } from "@/data/categories";
import { getOrgSettings } from "@/server/services/settings.service";
import { DEFAULT_ORG_ID } from "@/config/constants";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const settings = await getOrgSettings(DEFAULT_ORG_ID);
  const categories = applyCategoryNameOverrides(settings.categoryNames);

  return (
    <CategoriesProvider categories={categories}>
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </CategoriesProvider>
  );
}
