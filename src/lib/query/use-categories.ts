"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import * as categoriesApi from "@/lib/api/categories";
import { queryKeys } from "@/lib/query/keys";
import { useSettingsQuery } from "@/lib/query/use-admin";
import { applyCategoryNameOverrides } from "@/data/categories";
import type { Category } from "@/lib/schemas/news.schema";

export function useCategoriesQuery() {
  return useQuery({
    queryKey: queryKeys.categories.all(),
    queryFn: () => categoriesApi.getCategories(),
    staleTime: Infinity,
  });
}

export function useCategoryCountsQuery() {
  return useQuery({
    queryKey: queryKeys.categories.counts(),
    queryFn: () => categoriesApi.getCategoryCounts(),
  });
}

/** Admin-side equivalent of the site's CategoriesProvider — merges renamed categories from org settings. */
export function useAdminCategories(): Category[] {
  const { data: settings } = useSettingsQuery();
  return React.useMemo(() => applyCategoryNameOverrides(settings?.categoryNames ?? {}), [settings]);
}
