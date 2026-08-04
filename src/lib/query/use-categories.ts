"use client";

import { useQuery } from "@tanstack/react-query";
import * as categoriesApi from "@/lib/api/categories";
import { queryKeys } from "@/lib/query/keys";

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
