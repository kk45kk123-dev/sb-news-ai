"use client";

import * as React from "react";
import { CATEGORIES } from "@/data/categories";
import type { Category } from "@/lib/schemas/news.schema";

/**
 * Holds the effective category list (base CATEGORIES with admin-renamed
 * display names merged in). The value is computed server-side once, in
 * (site)/layout.tsx, and handed down here — no client fetch, no loading
 * flicker in global chrome (navbar/footer) that used to import the static
 * array directly.
 */
const CategoriesContext = React.createContext<Category[]>(CATEGORIES);

export function CategoriesProvider({ categories, children }: { categories: Category[]; children: React.ReactNode }) {
  return <CategoriesContext.Provider value={categories}>{children}</CategoriesContext.Provider>;
}

export function useCategories(): Category[] {
  return React.useContext(CategoriesContext);
}

export function useCategoryById(id: string | undefined | null): Category | undefined {
  const categories = useCategories();
  return id ? categories.find((c) => c.id === id) : undefined;
}
